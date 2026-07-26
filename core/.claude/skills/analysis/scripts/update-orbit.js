#!/usr/bin/env node
// update-orbit.js — write the derived orbit record to .claude/state/orbit.json.
// The orbit is re-derived every run, never a hand-configured list that goes stale
// (workflow/DESIGN.md, "Analysis"). It records which repos were admitted, by which
// signals, and whether the link scan ran — so the next run starts from the last
// known layout and re-pays classification only for the delta.
//
// Usage: update-orbit.js --classifications <file.json> --link-scan-ran <true|false> [--date YYYY-MM-DD]
//   classifications: a JSON array of classify-repo.js outputs.
// Writes .claude/state/orbit.json and prints a one-line summary.

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const ORBIT = path.join(ROOT, '.claude', 'state', 'orbit.json');

function parse(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--classifications') o.file = argv[++i];
    else if (argv[i] === '--link-scan-ran') o.linkScan = argv[++i] === 'true';
    else if (argv[i] === '--date') o.date = argv[++i];
  }
  return o;
}

const o = parse(process.argv.slice(2));
if (!o.file) { console.error('update-orbit: missing --classifications'); process.exit(1); }

const classifications = JSON.parse(fs.readFileSync(o.file, 'utf8'));
const repos = {};
let admitted = 0, dropped = 0, leads = 0;
for (const c of classifications) {
  repos[c.repo] = { admit: c.admit, signals: c.signals, needs_second_look: !!c.needs_second_look, reason: c.reason };
  if (c.admit) admitted++;
  else if (c.needs_second_look) leads++;
  else dropped++;
}

const record = {
  derived_at: o.date || new Date().toISOString().slice(0, 10),
  link_scan_ran: !!o.linkScan,
  repos,
};
fs.writeFileSync(ORBIT, JSON.stringify(record, null, 2) + '\n');
console.log(`orbit: ${admitted} admitted, ${leads} leads (second look), ${dropped} dropped; link scan ran: ${!!o.linkScan}`);
