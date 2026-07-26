#!/usr/bin/env node
// cache-diff.js — the sweep's economy engine, no tokens spent. Diffs the open
// items against .claude/state/cache/ and sorts them into what needs a model and
// what does not (workflow/DESIGN.md, "Sweep" / "Cost controls" §3):
//
//   - unchanged            cache exists AND judged_against == updated_at
//                          (served free — EXCEPT its staleness re-verify, below)
//   - changed              cache exists AND judged_against != updated_at  -> triage
//   - never_judged         no cache entry                                 -> triage
//   - staleness_reverify   cache has a staleness verdict whose codebase_position
//                          is behind the current default branch           -> triage
//
// The staleness re-verify is the deliberate exception to "unchanged = free": a
// staleness verdict is about the CODEBASE, not only the item, so it re-verifies
// every sweep when the branch has moved (still triage-priced; frontier only if
// triage flags it).
//
// Usage: cache-diff.js [--file items.json | <stdin>] --codebase-sha <sha>
// Emits JSON: { unchanged, changed, never_judged, staleness_reverify } (each an array of {number,url})

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const CACHE = path.join(ROOT, '.claude', 'state', 'cache');

function parse(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--file') o.file = argv[++i];
    else if (argv[i] === '--codebase-sha') o.sha = argv[++i];
  }
  return o;
}

function readCache(number) {
  const f = path.join(CACHE, `${number}.json`);
  if (!fs.existsSync(f)) return null;
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
}

const o = parse(process.argv.slice(2));
const items = JSON.parse(o.file ? fs.readFileSync(o.file, 'utf8') : fs.readFileSync(0, 'utf8'));

const out = { unchanged: [], changed: [], never_judged: [], staleness_reverify: [] };

for (const it of items) {
  const ref = { number: it.number, url: it.url };
  const c = readCache(it.number);

  if (!c) { out.never_judged.push(ref); continue; }

  const changed = c.judged_against !== it.updated_at;
  if (changed) { out.changed.push(ref); }
  else { out.unchanged.push(ref); }

  // Staleness re-verify: even an unchanged item re-checks its staleness verdict
  // when the codebase moved past what it was judged against.
  if (c.staleness && c.staleness.codebase_position) {
    const pos = String(c.staleness.codebase_position);
    const moved = o.sha && !pos.endsWith(o.sha) && pos !== o.sha;
    if (moved) out.staleness_reverify.push({ ...ref, was: pos, now: o.sha });
  }
}

console.log(JSON.stringify(out, null, 2));
