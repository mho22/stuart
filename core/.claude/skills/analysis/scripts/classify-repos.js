#!/usr/bin/env node
// classify-repos.js — enforce the orbit boundary for a WHOLE window's repo set in
// one process (MAINTAINING.md rule 7; workflow/DESIGN.md, "Analysis"). The plural
// sibling of classify-repo.js: the boundary logic below is a faithful copy of it,
// signal for signal and in the same order, so the two can never disagree about who
// is in the orbit. Output shape is identical, so update-orbit.js consumes it
// unchanged. Ownership is never the test.
//
// WHY BATCH: classify-repo.js costs one node process per repo. A 128-repo window
// spawned 128 processes and re-read steward.json 128 times. That is now paid once.
//
// WHY NO SEARCH: an earlier draft replaced the per-repo metadata fetch with one
// search/repositories query per orbit proper name. It was measured against a
// known-good orbit and admitted 13 repos where the rulebook admits 9. GitHub's
// search index tokenises the hyphen out of "wordpress-playground", so the query
// also matches the loose phrase "WordPress Playground" and even the repo's name —
// while rule 7's test is a substring match on the hyphenated proper name, written
// that way precisely because "the bare word playground names half of GitHub and
// never admits". The four false admissions were exactly that: repos whose
// description says "WordPress Playground" with a space. A tokenised search cannot
// express this boundary, so the proper-name test is only ever applied here to a
// repo's OWN metadata, never to a search result.
//
// WHERE THE SPEED COMES FROM INSTEAD: --orbit. The orbit is re-derived every run,
// but the two signals that change run over run (is-target, linked-from-target) are
// free, and only the metadata-derived ones cost a call. Passing last run's
// orbit.json reuses those and re-pays only for repos it has never classified —
// the delta SKILL.md has always promised. The free signals are always recomputed,
// so a repo that stopped being linked still fades out on schedule.
//
// Usage:
//   classify-repos.js --repos <file.json> [--linked <links.json>]
//                     [--orbit <orbit.json>] [--max-cache-age-days 30]
//   repos:  JSON array of "owner/name" seen in the windows
//   linked: scan-links.js output; its linked_repos supply the link signal
//   orbit:  last run's .claude/state/orbit.json, to skip re-fetching known repos
// Emits a JSON array of the same per-repo objects classify-repo.js emits.
// Exit codes: 0 ok, 1 usage error.

'use strict';
const fs = require('fs');
const { ghApi } = require('./gh');
const { repository, orbit } = require('./config');

const TARGET = repository.toLowerCase();
const PROPER_NAMES = orbit.names.map((name) => name.toLowerCase());
const ORBIT_PKG = orbit.packages ? new RegExp(orbit.packages, 'i') : null;

// The signals that cost an upstream call, and so are the only ones worth caching.
const METADATA_SIGNALS = ['fork-of-target', 'proper-name-in-metadata', 'manifest-declares-packages'];

function parse(argv) {
  const o = { maxCacheAgeDays: 30 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--repos') o.repos = argv[++i];
    else if (argv[i] === '--linked') o.linked = argv[++i];
    else if (argv[i] === '--orbit') o.orbit = argv[++i];
    else if (argv[i] === '--max-cache-age-days') o.maxCacheAgeDays = parseInt(argv[++i], 10);
  }
  return o;
}

const o = parse(process.argv.slice(2));
if (!o.repos) { console.error('classify-repos: missing --repos'); process.exit(1); }

const repos = JSON.parse(fs.readFileSync(o.repos, 'utf8'));
const linked = new Set(
  (o.linked ? JSON.parse(fs.readFileSync(o.linked, 'utf8')).linked_repos : [])
    .map((repo) => repo.toLowerCase())
);

// ---- Load last run's classifications, if offered and still fresh enough.
const cache = new Map();
let cacheAgeDays = null;
if (o.orbit) {
  let record;
  try { record = JSON.parse(fs.readFileSync(o.orbit, 'utf8')); }
  catch (error) { console.error(`classify-repos: --orbit unreadable, classifying everything: ${error.message}`); }
  if (record && record.repos) {
    cacheAgeDays = record.derived_at
      ? Math.floor((Date.now() - Date.parse(record.derived_at)) / 86400000)
      : null;
    // A repo's description and topics can change upstream, so a cached answer is
    // only trusted for a bounded time. Past that the whole cache is ignored rather
    // than half-trusted: the orbit is re-derived every run, never a list that goes stale.
    if (cacheAgeDays !== null && cacheAgeDays > o.maxCacheAgeDays) {
      console.error(`classify-repos: orbit.json is ${cacheAgeDays}d old (max ${o.maxCacheAgeDays}d) — reclassifying everything`);
    } else {
      for (const [repo, entry] of Object.entries(record.repos)) {
        // "metadata unavailable" is a failed call, not an answer about the repo.
        // Caching it would make one bad night's network permanent.
        if (/^metadata unavailable/.test(entry.reason || '')) continue;
        cache.set(repo.toLowerCase(), (entry.signals || []).filter((s) => METADATA_SIGNALS.includes(s)));
      }
    }
  }
}

async function main() {
  const results = [];
  let fetched = 0, reused = 0;

  for (const repo of repos) {
    const key = repo.toLowerCase();
    const signals = [];
    let needsSecondLook = false;

    // 1. the watched repository itself. Free, and it never needs metadata.
    if (key === TARGET) {
      signals.push('is-target');
    } else {
      let metadataSignals = cache.get(key);

      if (metadataSignals) {
        reused++;
      } else {
        // 2. the repo's own evidence: fork lineage, then description / topics.
        let meta;
        try { meta = await ghApi(`repos/${repo}`); }
        catch (error) {
          // A repo whose evidence cannot be read is dropped, privacy-first
          // (SKILL.md, "A repo's metadata is unavailable").
          results.push({ repo, admit: false, signals: [], needs_second_look: false,
            reason: `metadata unavailable: ${error.message}` });
          fetched++;
          continue;
        }
        fetched++;
        metadataSignals = [];

        if (meta.fork) {
          const parent = ((meta.parent && meta.parent.full_name) || '').toLowerCase();
          const source = ((meta.source && meta.source.full_name) || '').toLowerCase();
          if (parent === TARGET || source === TARGET) metadataSignals.push('fork-of-target');
        }

        const hay = `${meta.description || ''} ${(meta.topics || []).join(' ')}`.toLowerCase();
        if (PROPER_NAMES.some((name) => hay.includes(name))) metadataSignals.push('proper-name-in-metadata');

        // 3. manifest declares the project's packages — LEAD only, never an admission.
        if (ORBIT_PKG) {
          try {
            const pkg = await ghApi(`repos/${repo}/contents/package.json`, {
              headers: ['Accept: application/vnd.github.raw'],
            });
            const text = typeof pkg === 'string' ? pkg : Buffer.from(pkg.content || '', 'base64').toString('utf8');
            if (ORBIT_PKG.test(text)) metadataSignals.push('manifest-declares-packages');
          } catch { /* no package.json is fine */ }
        }
      }

      // Signal order matches classify-repo.js: fork, proper name, link, manifest.
      if (metadataSignals.includes('fork-of-target')) signals.push('fork-of-target');
      if (metadataSignals.includes('proper-name-in-metadata')) signals.push('proper-name-in-metadata');
      // 4. link signal — recomputed fresh every run, never cached: it is what moves
      // as recent playground work moves, and it is free.
      if (linked.has(key)) signals.push('linked-from-target');
      if (metadataSignals.includes('manifest-declares-packages')) {
        signals.push('manifest-declares-packages');
        const strongOthers = signals.some((signal) => signal !== 'manifest-declares-packages');
        if (!strongOthers) needsSecondLook = true;
      }
    }

    // Admission rule: any signal other than a bare manifest admits. A manifest-only
    // candidate is held for a second look, not auto-admitted.
    const strong = signals.filter((signal) => signal !== 'manifest-declares-packages');
    const admit = strong.length > 0;
    results.push({
      repo, admit, signals, needs_second_look: needsSecondLook,
      reason: admit
        ? `admitted by: ${strong.join(', ')}`
        : (needsSecondLook
            ? 'manifest-only lead — needs a corroborating second look before admission'
            : 'no admitting signal — dropped (privacy-first)'),
    });
  }

  console.log(JSON.stringify(results, null, 2));
  console.error(
    `classified=${results.length} admitted=${results.filter((r) => r.admit).length} ` +
    `leads=${results.filter((r) => !r.admit && r.needs_second_look).length} ` +
    `fetched=${fetched} reused=${reused}` +
    (cacheAgeDays === null ? '' : ` (orbit cache ${cacheAgeDays}d old)`)
  );
}

main().catch((error) => { console.error(`classify-repos: ${error.message}`); process.exit(1); });
