#!/usr/bin/env node
// reconcile.js — the sweep's close-out verification, no tokens spent. One call
// answers every question step 5 asks: coverage in both directions, items
// carrying two messages, cache health, the voice checks (an em dash in a body,
// a message linking its own item), and the kind counts for the ledger. The
// main context runs this once instead of answering the same questions with
// repeated shell commands, each of which replays the whole session at model
// prices (workflow/DESIGN.md, "Cost controls" §2, amendment of 2026-09-23).
//
// Usage: reconcile.js [--file items.json | <stdin>]
// Emits JSON: { open, messages, kinds, without_message, with_two,
//               orphan_messages, without_cache, orphan_cache, broken_pointers,
//               em_dash, self_link, clean }

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
const open = new Map(items.map((it) => [String(it.number), it.url]));

// messages/ — one file per open item, and the voice checks on each body.
const byNumber = new Map(); // number -> [files]
const kinds = {};
const emDash = [];
const selfLink = [];
if (fs.existsSync(MESSAGES)) {
  for (const f of fs.readdirSync(MESSAGES).sort()) {
    const m = f.match(/^(\d+)-([a-z]+)\.md$/);
    if (!m) continue;
    const [, n, kind] = m;
    if (!byNumber.has(n)) byNumber.set(n, []);
    byNumber.get(n).push(f);
    kinds[kind] = (kinds[kind] || 0) + 1;

    const text = fs.readFileSync(path.join(MESSAGES, f), 'utf8');
    const lines = text.split('\n');
    let body = text;
    if (lines[0] === '---') {
      const end = lines.indexOf('---', 1);
      if (end !== -1) body = lines.slice(end + 1).join('\n');
    }
    if (body.includes('—')) emDash.push(`messages/${f}`);
    const own = new RegExp(`github\\.com/${REPO}/(?:issues|pull)/${n}(?![0-9])`);
    if (own.test(body)) selfLink.push(`messages/${f}`);
  }
}

const withoutMessage = [];
for (const [n, url] of open) {
  if (!byNumber.has(n)) withoutMessage.push({ number: Number(n), url });
}
const withTwo = [];
const orphanMessages = [];
for (const [n, files] of byNumber) {
  if (files.length > 1) withTwo.push({ number: Number(n), files });
  if (!open.has(n)) orphanMessages.push(...files.map((f) => `messages/${f}`));
}

// cache/ — one entry per open item, every message pointer resolving to a file.
const cached = new Set();
const brokenPointers = [];
const orphanCache = [];
if (fs.existsSync(CACHE)) {
  for (const f of fs.readdirSync(CACHE).sort()) {
    const m = f.match(/^(\d+)\.json$/);
    if (!m) continue;
    const n = m[1];
    cached.add(n);
    if (!open.has(n)) { orphanCache.push(`.claude/state/cache/${f}`); continue; }
    let entry;
    try { entry = JSON.parse(fs.readFileSync(path.join(CACHE, f), 'utf8')); } catch { entry = null; }
    const missing = (entry && entry.messages || []).filter((p) => !fs.existsSync(path.join(MESSAGES, p)));
    if (!entry || missing.length) brokenPointers.push({ number: Number(n), missing: entry ? missing : ['(unreadable entry)'] });
  }
}
const withoutCache = [];
for (const [n, url] of open) {
  if (!cached.has(n)) withoutCache.push({ number: Number(n), url });
}

const messageCount = [...byNumber.values()].reduce((a, b) => a + b.length, 0);
const clean =
  withoutMessage.length === 0 && withTwo.length === 0 && orphanMessages.length === 0 &&
  withoutCache.length === 0 && orphanCache.length === 0 && brokenPointers.length === 0 &&
  emDash.length === 0 && selfLink.length === 0 && open.size === messageCount;

console.log(JSON.stringify({
  open: open.size,
  messages: messageCount,
  kinds,
  without_message: withoutMessage,
  with_two: withTwo,
  orphan_messages: orphanMessages,
  without_cache: withoutCache,
  orphan_cache: orphanCache,
  broken_pointers: brokenPointers,
  em_dash: emDash,
  self_link: selfLink,
  clean,
}, null, 2));
