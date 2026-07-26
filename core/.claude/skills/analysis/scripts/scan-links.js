#!/usr/bin/env node
// scan-links.js — derive the LINK signal for the orbit boundary.
// The link signal ("recent items in the watched repository link to this repo") is
// only as real as its derivation (workflow/DESIGN.md, "Analysis"): until this scan
// runs, the signal is inactive and no repo may be admitted on it. This script scans
// a recent window of issues/PRs in steward.json's `repository` (title, body, and
// comments) for github.com/<owner>/<repo> links, and emits the set of linked repos.
//
// Usage: scan-links.js [--window-days 90] [--max-items 200]
// Emits JSON: { scanned, window_days, since, linked_repos:[full_name...] }

'use strict';
const { ghApi, searchIssues } = require('./gh');
const { repository: TARGET } = require('./config');

const SELF = new Set([TARGET]);

function parse(argv) {
  const o = { window_days: 90, max_items: 200 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--window-days') o.window_days = parseInt(argv[++i], 10);
    else if (argv[i] === '--max-items') o.max_items = parseInt(argv[++i], 10);
  }
  return o;
}

const o = parse(process.argv.slice(2));
const since = new Date(Date.now() - o.window_days * 86400000).toISOString().slice(0, 10);

const linkRe = /github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/g;
const linked = new Set();

function harvest(text) {
  if (!text) return;
  let m;
  while ((m = linkRe.exec(text)) !== null) {
    let full = m[1].replace(/\.git$/, '');
    // strip trailing path segments like /issues/123
    full = full.split('/').slice(0, 2).join('/');
    if (!SELF.has(full)) linked.add(full);
  }
}

async function main() {
  let scanned = 0;
  try {
    const items = await searchIssues(`repo:${TARGET} updated:>=${since}`, { maxPages: Math.ceil(o.max_items / 100) });
    for (const it of items.slice(0, o.max_items)) {
      scanned++;
      harvest(it.title);
      harvest(it.body);
      // pull comments for this item (read-only)
      try {
        const comments = await ghApi(`repos/${TARGET}/issues/${it.number}/comments`, { fields: { per_page: '100' } });
        for (const c of comments) harvest(c.body);
      } catch { /* comment fetch failure is non-fatal; body links still counted */ }
    }
  } catch (e) {
    console.error(`scan-links: search failed: ${e.message}`);
    process.exit(1);
  }

  console.log(JSON.stringify({
    scanned, window_days: o.window_days, since,
    linked_repos: [...linked].sort(),
  }, null, 2));
}

main().catch((error) => { console.error(`scan-links: ${error.message}`); process.exit(1); });
