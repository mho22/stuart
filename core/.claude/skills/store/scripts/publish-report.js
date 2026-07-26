#!/usr/bin/env node
// store operation: publish-report(workflow, date, body)
// Writes reports/<date>-<workflow>.md, then prunes that workflow's reports beyond
// the three most recent (git history keeps the rest). Pruning is per-workflow, so
// sweep and analysis each keep their own three.
//
// Usage:
//   publish-report.js --workflow <wf> --date <YYYY-MM-DD> [--body <text> | --body-file <path> | <stdin>]

'use strict';
const fs = require('fs');
const path = require('path');
const { DIRS, WORKFLOWS, parseArgs, readBody, ensureDir } = require('./lib');

const { flags } = parseArgs(process.argv.slice(2));

function die(msg) { console.error(`publish-report: ${msg}`); process.exit(1); }

if (!flags.workflow) die('missing --workflow');
if (!WORKFLOWS.includes(flags.workflow)) die(`--workflow must be one of: ${WORKFLOWS.join(', ')}`);
if (!flags.date) die('missing --date (YYYY-MM-DD)');
if (!/^\d{4}-\d{2}-\d{2}$/.test(flags.date)) die('--date must be YYYY-MM-DD');

const body = readBody(flags).replace(/\s+$/, '') + '\n';

ensureDir(DIRS.reports);
const file = path.join(DIRS.reports, `${flags.date}-${flags.workflow}.md`);
fs.writeFileSync(file, body);

// Prune: keep the three most recent reports for THIS workflow only.
const suffix = `-${flags.workflow}.md`;
const mine = fs.readdirSync(DIRS.reports)
  .filter((f) => f.endsWith(suffix) && /^\d{4}-\d{2}-\d{2}-/.test(f))
  .sort() // date-prefixed names sort chronologically
  .reverse();
const pruned = [];
for (const f of mine.slice(3)) {
  fs.unlinkSync(path.join(DIRS.reports, f));
  pruned.push(f);
}

console.log(path.relative(path.join(DIRS.reports, '..'), file));
if (pruned.length) console.log(`pruned: ${pruned.join(', ')}`);
