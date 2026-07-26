#!/usr/bin/env node
// update-timestamp.js — advance one workflow's last-run timestamp.
// SIBLING COPIES: deliberately duplicated into sweep/scripts/ and analysis/scripts/
// so each skill's allowed-tools stays confined to its own scripts/
// (workflow/DESIGN.md, "The skills"). Edit both together or not at all.
//
// This is a RUN RECORD, written LAST, only after everything else a run produces is
// on disk. What needs judgment is defined by the cache diff against messages/ and
// the cache — never by this timestamp (workflow/DESIGN.md, "State").
//
// Usage: update-timestamp.js --workflow <sweep|analysis> [--at <ISO8601>]

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const FILE = path.join(ROOT, '.claude', 'state', 'last-run.json');
const WORKFLOWS = ['sweep', 'analysis'];

function parse(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--workflow') o.workflow = argv[++i];
    else if (argv[i] === '--at') o.at = argv[++i];
  }
  return o;
}

const o = parse(process.argv.slice(2));
if (!WORKFLOWS.includes(o.workflow)) {
  console.error(`update-timestamp: --workflow must be one of ${WORKFLOWS.join(', ')}`);
  process.exit(1);
}

let state = { sweep: null, analysis: null };
try { state = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { /* seed */ }

state[o.workflow] = o.at || new Date().toISOString();
fs.writeFileSync(FILE, JSON.stringify(state, null, 2) + '\n');
console.log(`last-run[${o.workflow}] = ${state[o.workflow]}`);
