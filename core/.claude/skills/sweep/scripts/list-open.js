#!/usr/bin/env node
// list-open.js — list every open issue and PR with last-activity data.
// The sweep's foundation: one deterministic listing the compute scripts
// (inactivity, pr-counts, cache-diff, housekeeping) all consume, so tokens are
// spent on judgment, not plumbing. Read-only: gh -X GET.
//
// PRs come from the pulls endpoint (so `draft` is known — drafts are exempt from
// the cap but not the clock); issues come from the issues endpoint with PRs
// filtered out (the issues endpoint returns PRs too).
//
// Usage: list-open.js [--repo <owner/name>]
// Emits JSON array: [{number,type,title,url,author,created_at,updated_at,is_draft,labels,assignees,requested_reviewers}]

'use strict';
const { ghApi } = require('./gh');
const { repository } = require('./config');

function parse(argv) {
  const o = { repo: repository };
  for (let i = 0; i < argv.length; i++) if (argv[i] === '--repo') o.repo = argv[++i];
  return o;
}
const o = parse(process.argv.slice(2));

async function main() {
  const items = [];

  // Pull requests (draft flag available here).
  const pulls = await ghApi(`repos/${o.repo}/pulls`, { fields: { state: 'open', per_page: '100' }, paginate: true });
  for (const p of pulls) {
    items.push({
      number: p.number, type: 'pr', title: p.title, url: p.html_url,
      author: p.user && p.user.login,
      created_at: p.created_at, updated_at: p.updated_at,
      is_draft: !!p.draft,
      labels: (p.labels || []).map((l) => (typeof l === 'string' ? l : l.name)),
      assignees: (p.assignees || []).map((a) => a.login),
      requested_reviewers: (p.requested_reviewers || []).map((r) => r.login),
    });
  }

  // Issues (filter out PRs, which the issues endpoint also returns).
  const issues = await ghApi(`repos/${o.repo}/issues`, { fields: { state: 'open', per_page: '100' }, paginate: true });
  for (const it of issues) {
    if (it.pull_request) continue;
    items.push({
      number: it.number, type: 'issue', title: it.title, url: it.html_url,
      author: it.user && it.user.login,
      created_at: it.created_at, updated_at: it.updated_at,
      is_draft: false,
      labels: (it.labels || []).map((l) => (typeof l === 'string' ? l : l.name)),
      assignees: (it.assignees || []).map((a) => a.login),
      requested_reviewers: [],
    });
  }

  items.sort((a, b) => a.number - b.number);
  console.log(JSON.stringify(items, null, 2));
}

main().catch((error) => { console.error(`list-open: ${error.message}`); process.exit(1); });
