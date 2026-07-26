#!/usr/bin/env node
// Shared helpers for the store scripts. Lives inside store/scripts/, so every
// store script may require it without widening any skill's allowed-tools sandbox.
// The store's scripts are the one deliberately shared set (workflow/DESIGN.md,
// "The skills") — do not copy this into other skills.

'use strict';
const path = require('path');
const fs = require('fs');

// scripts/ -> store -> skills -> .claude -> repo root
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

const DIRS = {
  messages: path.join(REPO_ROOT, 'messages'),
  reports: path.join(REPO_ROOT, 'reports'),
  cache: path.join(REPO_ROOT, '.claude', 'state', 'cache'),
};

const MESSAGE_KINDS = ['concerns', 'reviewer', 'reminder', 'cap', 'staleness', 'silence'];
const WORKFLOWS = ['sweep', 'analysis'];

// Pull the issue/PR number out of an upstream item URL or a bare number.
// Issues and PRs share one number space, so /issues/<n> and /pull/<n> both work.
function itemNumber(item) {
  const s = String(item).trim();
  const m = s.match(/\/(?:issues|pull)\/(\d+)/);
  if (m) return m[1];
  const bare = s.match(/^#?(\d+)$/);
  if (bare) return bare[1];
  const tail = s.match(/(\d+)\/?$/);
  if (tail) return tail[1];
  throw new Error(`cannot extract an item number from: ${item}`);
}

// Read named flags from argv. Returns { flags, positionals }.
function parseArgs(argv) {
  const flags = {};
  const positionals = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i++;
      }
    } else {
      positionals.push(a);
    }
  }
  return { flags, positionals };
}

// Body text: from --body, or --body-file, or stdin. Stdin keeps large markdown
// bodies off the command line where quoting would mangle them.
function readBody(flags) {
  if (typeof flags.body === 'string') return flags.body;
  if (flags['body-file']) return fs.readFileSync(flags['body-file'], 'utf8');
  const stdin = fs.readFileSync(0, 'utf8');
  if (stdin.trim() === '') throw new Error('no body provided (--body, --body-file, or stdin)');
  return stdin;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

module.exports = {
  REPO_ROOT, DIRS, MESSAGE_KINDS, WORKFLOWS,
  itemNumber, parseArgs, readBody, ensureDir,
};
