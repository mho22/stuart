#!/usr/bin/env node
// store operation: recall(item)
// Reads back everything the steward currently believes about an item: its message
// files in messages/ and its cache entry in .claude/state/cache/. Used by any
// re-evaluation.
//
// Usage: recall.js --item <url|number>   [--json]

'use strict';
const fs = require('fs');
const path = require('path');
const { DIRS, itemNumber, parseArgs } = require('./lib');

const { flags } = parseArgs(process.argv.slice(2));
if (!flags.item) { console.error('recall: missing --item'); process.exit(1); }

const number = itemNumber(flags.item);

const messages = fs.existsSync(DIRS.messages)
  ? fs.readdirSync(DIRS.messages)
      .filter((f) => f.startsWith(`${number}-`) && f.endsWith('.md'))
      .sort()
      .map((f) => ({ file: `messages/${f}`, content: fs.readFileSync(path.join(DIRS.messages, f), 'utf8') }))
  : [];

const cacheFile = path.join(DIRS.cache, `${number}.json`);
let cache = null;
if (fs.existsSync(cacheFile)) {
  try { cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8')); }
  catch (e) { cache = { error: `unreadable cache entry: ${e.message}` }; }
}

const result = { item: flags.item, number, messages, cache };

if (flags.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`# recall #${number}`);
  console.log(`messages: ${messages.length ? messages.map((m) => m.file).join(', ') : '(none)'}`);
  console.log(`cache: ${cache ? `.claude/state/cache/${number}.json` : '(none)'}`);
  for (const m of messages) {
    console.log(`\n--- ${m.file} ---\n${m.content}`);
  }
  if (cache) console.log(`\n--- cache ---\n${JSON.stringify(cache, null, 2)}`);
}
