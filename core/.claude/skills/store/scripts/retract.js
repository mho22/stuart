#!/usr/bin/env node
// store operation: retract(item)
// Deletes an item's message files. Used by the sweep's housekeeping when a target
// item has closed: messages/ shows current beliefs only, git history keeps the
// archive. The cache entry is deleted alongside the messages (workflow/DESIGN.md,
// "State and the analysis cache": entries for closed items are deleted with them);
// pass --keep-cache to retract messages only.
//
// Usage: retract.js --item <url|number> [--keep-cache]

'use strict';
const fs = require('fs');
const path = require('path');
const { DIRS, itemNumber, parseArgs } = require('./lib');

const { flags } = parseArgs(process.argv.slice(2));
if (!flags.item) { console.error('retract: missing --item'); process.exit(1); }

const number = itemNumber(flags.item);
const removed = [];

if (fs.existsSync(DIRS.messages)) {
  for (const f of fs.readdirSync(DIRS.messages)) {
    if (f.startsWith(`${number}-`) && f.endsWith('.md')) {
      fs.unlinkSync(path.join(DIRS.messages, f));
      removed.push(`messages/${f}`);
    }
  }
}

if (!flags['keep-cache']) {
  const cacheFile = path.join(DIRS.cache, `${number}.json`);
  if (fs.existsSync(cacheFile)) {
    fs.unlinkSync(cacheFile);
    removed.push(`.claude/state/cache/${number}.json`);
  }
}

console.log(removed.length ? `retracted: ${removed.join(', ')}` : `nothing to retract for #${number}`);
