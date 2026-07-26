#!/usr/bin/env node
// search-window.js — assemble a member's recent activity window, PERSON-FIRST.
// Three global searches per member as the baseline (MAINTAINING.md rules 1, 7;
// workflow/DESIGN.md, "Analysis"):
//   1. authored   — issues and PRs they opened
//   2. reviewed   — PRs they reviewed
//   3. involved   — threads they were pulled into (commenter/assignee/mention)
// Global, not repo-scoped: this finds what the person actually did, wherever they
// did it. The boundary filter (classify-repos.js) decides afterward which repos'
// items may be kept. Follow-ups are allowed and COUNTED — pass --follow-up "<q>"
// (repeatable) when the window comes back thin or a thread clearly continues.
//
// A FAILED SEARCH IS NOT AN EMPTY WINDOW. This script used to record a failure as
// `{count: 0, error}` and still exit 0, so a caller reading counts could not tell a
// genuinely quiet member from a search that never came back. The profile rule that
// an honest empty window is fine to write down only holds if empty means empty, so
// an incomplete window is now marked in the JSON *and* exits non-zero. gh.js
// already retries transport failures, so a search that still fails here has
// really failed and the run must be told, not left to guess.
//
// Usage:
//   search-window.js --member <user> [--window-days 90] [--follow-up "<extra query>"]...
// Emits JSON: { member, window_days, since, complete, failed_searches:[kind],
//               searches:[{kind,q,count,error?}], items:[...], repos:[...] }
// Exit codes: 0 complete, 1 usage error, 2 window INCOMPLETE (a search failed).

'use strict';
const { searchIssues } = require('./gh');

function parse(argv) {
  const o = { window_days: 90, followUps: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--member') o.member = argv[++i];
    else if (argv[i] === '--window-days') o.window_days = parseInt(argv[++i], 10);
    else if (argv[i] === '--follow-up') o.followUps.push(argv[++i]);
  }
  return o;
}

const o = parse(process.argv.slice(2));
if (!o.member) { console.error('search-window: missing --member'); process.exit(1); }

const since = new Date(Date.now() - o.window_days * 86400000).toISOString().slice(0, 10);
const win = `updated:>=${since}`;

const baseline = [
  { kind: 'authored', q: `author:${o.member} ${win}` },
  { kind: 'reviewed', q: `reviewed-by:${o.member} type:pr ${win}` },
  { kind: 'involved', q: `involves:${o.member} ${win}` },
];
const followUps = o.followUps.map((q, i) => ({ kind: `follow-up-${i + 1}`, q: `${q} ${win}`.trim() }));

async function main() {
  const searches = [];
  const failedSearches = [];
  const seen = new Map(); // dedupe items by html_url
  for (const s of [...baseline, ...followUps]) {
    let items;
    try { items = await searchIssues(s.q); }
    catch (error) {
      // count is null, never 0: a search that failed counted nothing, and writing 0
      // here is exactly the lie that makes a lost search read as a quiet member.
      searches.push({ kind: s.kind, q: s.q, count: null, error: error.message });
      failedSearches.push(s.kind);
      continue;
    }
    for (const it of items) if (!seen.has(it.html_url)) seen.set(it.html_url, it);
    searches.push({ kind: s.kind, q: s.q, count: items.length });
  }

  const items = [...seen.values()].map((it) => ({
    number: it.number,
    title: it.title,
    url: it.html_url,
    is_pr: !!it.pull_request,
    repo: (it.repository_url || '').replace('https://api.github.com/repos/', ''),
    updated_at: it.updated_at,
    state: it.state,
  }));

  const repos = [...new Set(items.map((i) => i.repo).filter(Boolean))].sort();
  const complete = failedSearches.length === 0;

  console.log(JSON.stringify({
    member: o.member, window_days: o.window_days, since,
    complete, failed_searches: failedSearches,
    searches, items, repos,
  }, null, 2));

  if (!complete) {
    console.error(
      `search-window: INCOMPLETE window for ${o.member} — ${failedSearches.length} of ` +
      `${searches.length} searches failed (${failedSearches.join(', ')}). This is a lost ` +
      `search, not a quiet member: do not write an empty window from it, and do not fade ` +
      `scope out on it. Re-run the member before profiling.`
    );
    process.exit(2);
  }
}

main().catch((error) => { console.error(`search-window: ${error.message}`); process.exit(1); });
