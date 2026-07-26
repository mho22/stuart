#!/usr/bin/env node
// pr-counts.js — per-person open-PR counts and the cap nudge (CONTRIBUTING.md
// rule 4), no tokens spent. Counts open NON-DRAFT PRs per roster member (a draft
// asks for no review yet, so it does not count toward the cap). Emits who is over
// the cap and which PRs are over it, so the model can nudge on the over-cap PR.
//
// The cap binds the roster only — steward.json's `roster`, not the file list in
// maintainers/. Those files are output, written by analysis, and are gitignored, so
// a fresh clone has none: reading them here would silently bind nobody and emit an
// empty cap report that looks like a clean backlog. Pure compute over list-open.js
// output.
//
// Usage: pr-counts.js [--file items.json | <stdin>] [--cap 5]
// Emits JSON: { cap, counts:{user:n}, over_cap:[{user,count,over_cap_prs:[{number,url,created_at}]}] }

'use strict';
const fs = require('fs');
const { roster } = require('./config');

function parse(argv) {
  const o = { cap: 5 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--file') o.file = argv[++i];
    else if (argv[i] === '--cap') o.cap = parseInt(argv[++i], 10);
  }
  return o;
}

const o = parse(process.argv.slice(2));
const items = JSON.parse(o.file ? fs.readFileSync(o.file, 'utf8') : fs.readFileSync(0, 'utf8'));
const team = new Set(roster);

// Group open non-draft PRs by roster author.
const byUser = {};
for (const it of items) {
  if (it.type !== 'pr' || it.is_draft) continue;
  if (!team.has(it.author)) continue;
  (byUser[it.author] = byUser[it.author] || []).push(it);
}

const counts = {};
const over = [];
for (const [user, prs] of Object.entries(byUser)) {
  counts[user] = prs.length;
  if (prs.length > o.cap) {
    const sorted = prs.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    // The PRs beyond the cap are the most recently opened ones.
    const overPrs = sorted.slice(o.cap).map((p) => ({ number: p.number, url: p.url, created_at: p.created_at }));
    over.push({ user, count: prs.length, over_cap_prs: overPrs });
  }
}

console.log(JSON.stringify({ cap: o.cap, counts, over_cap: over }, null, 2));
