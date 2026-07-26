#!/usr/bin/env node
// write-cache.js — write/merge one analysis-cache entry (.claude/state/cache/<n>.json).
//
// The cache is local state, re-derivable from GitHub + the rulebooks — never an
// authoritative record (workflow/DESIGN.md, "State and the analysis cache"). One
// entry per judged item: what it was judged against, when, which messages resulted,
// a one-line verdict. Staleness additionally records the default-branch position it
// was judged against, because staleness is a judgment about the codebase, not only
// the item. MERGES with any existing entry so a later sweep only overwrites what
// it re-judged.
//
// Usage:
//   write-cache.js --item <url|n> --type <issue|pr> --workflow sweep \
//     --judged-against <ISO8601> [--judged-at <ISO8601>] \
//     [--messages "2905-concerns.md,2905-reviewer.md"] [--verdict "..."] \
//     [--staleness-verdict "not stale"] [--codebase-sha <sha>]

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const CACHE = path.join(ROOT, '.claude', 'state', 'cache');

function itemNumber(s) {
  s = String(s).trim();
  const m = s.match(/\/(?:issues|pull)\/(\d+)/) || s.match(/^#?(\d+)$/) || s.match(/(\d+)\/?$/);
  if (!m) throw new Error(`cannot extract number from ${s}`);
  return m[1];
}

function parse(argv) {
  const o = { flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) o.flags[a.slice(2)] = argv[++i];
  }
  return o;
}

const { flags } = parse(process.argv.slice(2));
if (!flags.item) { console.error('write-cache: missing --item'); process.exit(1); }
if (!flags.workflow) { console.error('write-cache: missing --workflow'); process.exit(1); }
if (!flags['judged-against']) { console.error('write-cache: missing --judged-against'); process.exit(1); }

const number = itemNumber(flags.item);
fs.mkdirSync(CACHE, { recursive: true });
const file = path.join(CACHE, `${number}.json`);

let entry = { number: Number(number) };
if (fs.existsSync(file)) {
  try { entry = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* overwrite corrupt */ }
}

entry.number = Number(number);
entry.item = flags.item.startsWith('http') ? flags.item : entry.item;
if (flags.type) entry.type = flags.type;
entry.workflow = flags.workflow;
entry.judged_against = flags['judged-against'];
entry.judged_at = flags['judged-at'] || new Date().toISOString();
if (flags.messages) entry.messages = flags.messages.split(',').map((s) => s.trim()).filter(Boolean);
if (flags.verdict) entry.verdict = flags.verdict;

if (flags['staleness-verdict'] || flags['codebase-sha']) {
  entry.staleness = entry.staleness || {};
  if (flags['staleness-verdict']) entry.staleness.verdict = flags['staleness-verdict'];
  if (flags['codebase-sha']) entry.staleness.codebase_position = flags['codebase-sha'];
  entry.staleness.judged_at = entry.judged_at;
}

fs.writeFileSync(file, JSON.stringify(entry, null, 2) + '\n');
console.log(`.claude/state/cache/${number}.json`);
