#!/usr/bin/env node
// inactivity.js — the 30-day math (CONTRIBUTING.md rule 5), no tokens spent.
// Deterministic: which open items have crossed 30 days of silence, MINUS the ones
// whose standing reminder is still the thread's last word (one reminder is enough;
// only new activity re-arms the clock). Pure compute over list-open.js output +
// the reminder messages already on disk — the model does only the human part
// afterward (reading who the thread waits on, writing the warm reminder).
//
// Drafts are INCLUDED (the clock runs on drafts too; only the cap exempts them).
//
// Usage: inactivity.js [--file items.json | <stdin>] [--now YYYY-MM-DD] [--days 30]
// Emits JSON: { now, days, due:[{number,url,type,updated_at,days_silent,has_standing_reminder}], not_due, already_reminded }

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const MESSAGES = path.join(ROOT, 'messages');

function parse(argv) {
  const o = { days: 30 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--file') o.file = argv[++i];
    else if (argv[i] === '--now') o.now = argv[++i];
    else if (argv[i] === '--days') o.days = parseInt(argv[++i], 10);
  }
  return o;
}

function readItems(o) {
  const raw = o.file ? fs.readFileSync(o.file, 'utf8') : fs.readFileSync(0, 'utf8');
  return JSON.parse(raw);
}

// The updated_at recorded when the steward last wrote a reminder for this item.
function standingReminder(number) {
  const f = path.join(MESSAGES, `${number}-reminder.md`);
  if (!fs.existsSync(f)) return null;
  const head = fs.readFileSync(f, 'utf8').split('\n').slice(0, 10).join('\n');
  const m = head.match(/^judged_against:\s*(\S+)/m);
  return m ? m[1] : 'unknown';
}

const o = parse(process.argv.slice(2));
const now = o.now ? new Date(o.now + 'T00:00:00Z') : new Date();
const items = readItems(o);

const due = [];
let notDue = 0, alreadyReminded = 0;

for (const it of items) {
  const updated = new Date(it.updated_at);
  const daysSilent = Math.floor((now - updated) / 86400000);
  if (daysSilent < o.days) { notDue++; continue; }

  const standing = standingReminder(it.number);
  if (standing && standing !== 'unknown') {
    // Reminder already written; re-arm only if the item moved since that reminder.
    if (new Date(it.updated_at) <= new Date(standing)) { alreadyReminded++; continue; }
  }

  due.push({
    number: it.number, url: it.url, type: it.type, is_draft: !!it.is_draft,
    updated_at: it.updated_at, days_silent: daysSilent,
    has_standing_reminder: !!standing,
  });
}

console.log(JSON.stringify({ now: now.toISOString(), days: o.days, due, not_due: notDue, already_reminded: alreadyReminded }, null, 2));
