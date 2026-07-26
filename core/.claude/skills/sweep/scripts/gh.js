#!/usr/bin/env node
// gh.js — read-only GitHub helper for the sweep skill's scripts.
// SIBLING COPIES: intentionally duplicated per skill so each skill's allowed-tools
// sandbox stays confined to its own scripts/. Keep identical to
// analysis/scripts/gh.js — edited together or not at all.
//
// GET-ONLY BY CONSTRUCTION. This helper used to shell out to `gh api -X GET`, where
// the guarantee was a regex in the guard hook watching for a flag that would flip
// the call to POST. It now calls fetch directly, and the guarantee is stronger and
// simpler: `method` is the literal string 'GET' at the single call site below, and
// no argument can change it. There is no body, no field flag, no graphql path.
//
// SAME-HOST BY CONSTRUCTION. Callers pass an API *path*, never a URL. The path is
// resolved against https://api.github.com and the resulting origin is checked before
// the request goes out, so a crafted path ("//evil.com", "https://evil.com",
// backslash tricks that WHATWG URL normalises to a host) cannot leave GitHub.
// Redirects are followed by hand, re-checking the origin each hop, because a
// followed 301 is the one way a same-host request becomes a different-host one.
//
// AUTH, most explicit source first: GITHUB_TOKEN (or GH_TOKEN) from the
// environment, then the repo's .env (the same file run.ts loads), then the local
// gh login where one exists. The fallbacks are for interactive sessions, which
// nothing pre-loads: a maintainer's machine keeps its token in the gh keychain and
// exports nothing; a server sets the environment and never installs gh.
// Unauthenticated GitHub is 60 requests/hour, far under one sweep, so no token at
// all fails loudly here rather than as a wall of 403s halfway through a run.
//
// TIMEOUT + RETRY: a stalled connect to api.github.com would otherwise hang on the
// platform default. A healthy call is ~400-600ms, so an 8s deadline sits far above
// p99 and turns a long stall into 8s plus a fast retry. A paginated walk is many
// requests, so it gets one budget for the whole walk rather than 8s per page.

'use strict';
const path = require('path');
const { execFileSync } = require('child_process');

const API_ORIGIN = 'https://api.github.com';
const MAX_REDIRECTS = 5;

const timeoutMs = Number(process.env.STEWARD_GH_TIMEOUT_MS || 8000);
const paginateTimeoutMs = Number(process.env.STEWARD_GH_PAGINATE_TIMEOUT_MS || 120000);
const retries = Number(process.env.STEWARD_GH_RETRIES || 4);

function envToken() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
}

function resolveToken() {
  if (envToken()) return envToken();
  try {
    process.loadEnvFile(path.resolve(__dirname, '..', '..', '..', '..', '..', '.env'));
    if (envToken()) return envToken();
  } catch { /* no .env is fine */ }
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { return ''; }
}

const token = resolveToken();

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

// A path, never a URL. Anything that could name a host is refused outright, and the
// resolved origin is checked afterwards as the catch-all for normalisation tricks.
function apiUrl(apiPath, fields) {
  const path = String(apiPath);

  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) throw new Error(`gh: absolute URL refused: ${path}`);
  if (/^[/\\]{2}/.test(path)) throw new Error(`gh: protocol-relative path refused: ${path}`);
  if (path.split(/[/\\]/).includes('..')) throw new Error(`gh: traversal refused: ${path}`);

  const url = new URL(path.replace(/^\/+/, ''), `${API_ORIGIN}/`);
  if (url.origin !== API_ORIGIN) throw new Error(`gh: path resolved off-host (${url.origin}): ${path}`);

  for (const [key, value] of Object.entries(fields || {})) url.searchParams.set(key, String(value));
  return url;
}

// Callers pass headers as "Name: value" strings, the shape the gh CLI took.
function buildHeaders(list) {
  const headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'stuart-steward',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  for (const entry of list || []) {
    const colon = String(entry).indexOf(':');
    if (colon === -1) continue;
    headers[String(entry).slice(0, colon).trim()] = String(entry).slice(colon + 1).trim();
  }
  return headers;
}

function wantsRaw(headers) {
  return /\.raw\b/.test(headers['Accept'] || '');
}

function nextPageUrl(linkHeader) {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(',')) {
    const match = /<([^>]+)>\s*;\s*rel\s*=\s*"?next"?/.exec(part);
    if (match) return match[1];
  }
  return null;
}

function httpError(status, url, retryAfter) {
  const error = new Error(`gh: HTTP ${status} ${url.pathname}`);
  error.status = status;
  // A 429 names its own wait; honoring it is the difference between riding out
  // a quota window and burning every retry inside it.
  const seconds = Number(retryAfter);
  if (seconds > 0) error.retryAfterMs = Math.min(seconds, 120) * 1000;
  return error;
}

// One request, following redirects by hand so every hop stays on api.github.com.
async function getOnce(url, headers, signal) {
  let current = url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await fetch(current, {
      method: 'GET',
      headers,
      signal,
      redirect: 'manual',
    });

    if (response.status < 300 || response.status >= 400) return { response, url: current };

    const location = response.headers.get('location');
    if (!location) return { response, url: current };

    const target = new URL(location, current);
    if (target.origin !== API_ORIGIN) throw new Error(`gh: redirect off-host refused: ${target.origin}`);
    current = target;
  }

  throw new Error(`gh: too many redirects from ${url.pathname}`);
}

// ghApi(path, {fields, headers, paginate}) -> parsed JSON (or array across pages).
// Returns raw text when the caller asked for a raw media type.
async function ghApi(apiPath, opts = {}) {
  if (!token) throw new Error('gh: no GitHub token — set GITHUB_TOKEN, add it to .env, or gh auth login');

  const headers = buildHeaders(opts.headers);
  const raw = wantsRaw(headers);
  const budget = opts.paginate ? paginateTimeoutMs : timeoutMs;

  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    // The whole walk shares one deadline, so a slow page cannot restart the walk.
    const deadline = Date.now() + budget;
    const signal = AbortSignal.timeout(budget);

    try {
      let url = apiUrl(apiPath, opts.fields);
      const pages = [];

      for (;;) {
        const { response, url: finalUrl } = await getOnce(url, headers, signal);
        if (!response.ok) throw httpError(response.status, finalUrl, response.headers.get('retry-after'));

        const body = await response.text();
        if (raw) return body;

        pages.push(JSON.parse(body || (opts.paginate ? '[]' : 'null')));

        if (!opts.paginate) return pages[0];

        const next = nextPageUrl(response.headers.get('link'));
        if (!next) break;
        // Out of budget mid-walk: fail the attempt rather than return a partial
        // listing that would read as a complete one — a truncated open-items walk
        // looks exactly like items having closed.
        if (Date.now() >= deadline) {
          throw new Error(`gh: pagination budget exhausted after ${pages.length} pages of ${url.pathname}`);
        }

        const target = new URL(next, `${API_ORIGIN}/`);
        if (target.origin !== API_ORIGIN) throw new Error(`gh: pagination off-host refused: ${target.origin}`);
        url = target;
      }

      return pages.flat();
    } catch (error) {
      lastError = error;
      // A 4xx is a real answer (missing repo, no package.json), not a transport
      // failure: it means the same thing on every attempt, so return it at once.
      // Only dial/timeout/transport failures and throttles are worth another go —
      // and GitHub's secondary rate limit signals as 403-with-Retry-After, not
      // 429, so the header decides, not the status alone.
      if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429 && !error.retryAfterMs) throw error;
      // A refused path is a caller bug and identical on every attempt.
      if (/^gh: (absolute URL|protocol-relative|traversal|path resolved|redirect off-host|pagination off-host)/.test(error.message)) throw error;
      if (attempt < retries) await sleep(error.retryAfterMs || 250 * attempt);
    }
  }
  throw lastError;
}

// GitHub's issue-search migration (reaching tokens gradually — the server's
// fine-grained PAT is already on it) rejects any query without a type: or is:
// qualifier with HTTP 422. The helper absorbs that here so callers keep their
// documented searches: a query that already names a type runs as one search; a
// typeless one runs twice, once per type, and the results merge — no dedupe
// needed, an item is never both. The cost is that each typeless logical search
// is two HTTP calls against the search quota, which the retry-on-429 path
// above absorbs. advanced_search stays: it is the documented opt-in to the new
// search implementation, necessary but not sufficient on migrated tokens.
async function searchIssues(q, { perPage = 100, maxPages = 5, sort, order } = {}) {
  const hasType = /(^|\s)(type|is):(issue|pr|pull-request)\b/i.test(q);
  const queries = hasType ? [q] : [`${q} type:issue`, `${q} type:pr`];
  const items = [];
  for (const query of queries) {
    for (let page = 1; page <= maxPages; page++) {
      const fields = { q: query, advanced_search: 'true', per_page: String(perPage), page: String(page) };
      if (sort) fields.sort = sort;
      if (order) fields.order = order;
      const res = await ghApi('search/issues', { fields });
      items.push(...(res.items || []));
      if (!res.items || res.items.length < perPage) break;
    }
  }
  return items;
}

module.exports = { ghApi, searchIssues };
