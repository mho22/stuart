#!/usr/bin/env node
// store operation: publish-message(item, kind, body, judged_against)
// Writes or overwrites messages/<number>-<kind>.md with a provenance frontmatter
// block and the verbatim comment body below it. This is the ONLY way a workflow
// records a would-be comment — no workflow writes messages/ directly.
//
// Usage:
//   publish-message.js --item <url> --kind <kind> --workflow <wf> --run <YYYY-MM-DD> \
//       --judged-against <ISO8601> [--title <item title>] [--author <handle>] \
//       [--summary <one or two sentences>] [--to <handle>] [--context <one line>] \
//       [--body <text> | --body-file <path> | <stdin>]
//
// judged-against is the item's updated-at at judgment time (omit only for a
// silence written before any judgment; it then records the run date).
// title and author are the item's own, verbatim from fetch-item — untrusted data
// recorded as provenance so a reader gets the item's context without opening it.
// summary is the steward's own sentence or two on what the item asks, where it
// stands, and why it matters — written fresh at judgment time, when the whole
// thread is already in context.
// to is the handle the message speaks to, for the message that names nobody:
// a cap nudge says "your open PRs" and a reader cannot tell whose.
// context is the thread comment the message answers — author, date, a short
// quote — collapsed to one line so the frontmatter stays flat key: value.

'use strict';
const fs = require('fs');
const path = require('path');
const { DIRS, MESSAGE_KINDS, WORKFLOWS, itemNumber, parseArgs, readBody, ensureDir } = require('./lib');

const { flags } = parseArgs(process.argv.slice(2));

function die(msg) { console.error(`publish-message: ${msg}`); process.exit(1); }

if (!flags.item) die('missing --item');
if (!flags.kind) die('missing --kind');
if (!MESSAGE_KINDS.includes(flags.kind)) die(`--kind must be one of: ${MESSAGE_KINDS.join(', ')}`);
if (!flags.workflow) die('missing --workflow');
if (!WORKFLOWS.includes(flags.workflow)) die(`--workflow must be one of: ${WORKFLOWS.join(', ')}`);
if (!flags.run) die('missing --run (the run date, YYYY-MM-DD)');

const number = itemNumber(flags.item);
const body = readBody(flags).replace(/\s+$/, '') + '\n';
const judgedAgainst = flags['judged-against'] || flags.run;

const lines = [
  '---',
  `item: ${flags.item}`,
];
if (typeof flags.title === 'string') lines.push(`title: ${flags.title.replace(/\s+/g, ' ').trim()}`);
if (typeof flags.author === 'string') lines.push(`author: ${flags.author.replace(/^@/, '').trim()}`);
if (typeof flags.summary === 'string') lines.push(`summary: ${flags.summary.replace(/\s+/g, ' ').trim()}`);
lines.push(`kind: ${flags.kind}`);
if (typeof flags.to === 'string') lines.push(`to: ${flags.to.replace(/^@/, '').trim()}`);
lines.push(
  `workflow: ${flags.workflow}`,
  `run: ${flags.run}`,
  `judged_against: ${judgedAgainst}`,
);
if (typeof flags.context === 'string') lines.push(`context: ${flags.context.replace(/\s+/g, ' ').trim()}`);
lines.push('---', '');
const frontmatter = lines.join('\n');

ensureDir(DIRS.messages);
const file = path.join(DIRS.messages, `${number}-${flags.kind}.md`);
fs.writeFileSync(file, frontmatter + body);
console.log(path.relative(path.join(DIRS.messages, '..'), file));
