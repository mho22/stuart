#!/usr/bin/env node
// housekeeping.js — find the steward's beliefs about items that have CLOSED, so the
// sweep can retract them (workflow/DESIGN.md, "Sweep"). messages/ shows current
// beliefs only; git history keeps the archive. An item is closed if it has message
// files and/or a cache entry but is NOT in the current open-items list.
//
// This script only IDENTIFIES; deletion happens through `store retract`, so the
// output interface stays uniform. Report pruning is handled by publish-report.js.
//
// Usage: housekeeping.js [--file items.json | <stdin>]
// Emits JSON: { closed:[{number,url,messages:[...],has_cache}] }

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const MESSAGES = path.join(ROOT, 'messages');
const CACHE = path.join(ROOT, '.claude', 'state', 'cache');
const REPO = require('./config').repository;

const argv = process.argv.slice(2);
let file;
for (let i = 0; i < argv.length; i++) if (argv[i] === '--file') file = argv[++i];

const items = JSON.parse(file ? fs.readFileSync(file, 'utf8') : fs.readFileSync(0, 'utf8'));
const openNumbers = new Set(items.map((it) => String(it.number)));

// Every number the steward currently holds beliefs about.
const held = new Map(); // number -> { messages:[], has_cache }
if (fs.existsSync(MESSAGES)) {
  for (const f of fs.readdirSync(MESSAGES)) {
    const m = f.match(/^(\d+)-[a-z]+\.md$/);
    if (!m) continue;
    const n = m[1];
    if (!held.has(n)) held.set(n, { messages: [], has_cache: false });
    held.get(n).messages.push(`messages/${f}`);
  }
}
if (fs.existsSync(CACHE)) {
  for (const f of fs.readdirSync(CACHE)) {
    const m = f.match(/^(\d+)\.json$/);
    if (!m) continue;
    const n = m[1];
    if (!held.has(n)) held.set(n, { messages: [], has_cache: false });
    held.get(n).has_cache = true;
  }
}

const closed = [];
for (const [n, info] of held) {
  if (openNumbers.has(n)) continue; // still open — keep
  closed.push({
    number: Number(n),
    url: `https://github.com/${REPO}/issues/${n}`,
    messages: info.messages,
    has_cache: info.has_cache,
  });
}
closed.sort((a, b) => a.number - b.number);

console.log(JSON.stringify({ closed }, null, 2));
