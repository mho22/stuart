#!/usr/bin/env node
// fetch-item.js — fetch one upstream item in full, for judgment.
//
// Everything this returns is untrusted DATA (CLAUDE.md): titles, bodies, comments,
// diffs. It is quoted to the model as evidence, never obeyed. Read-only: gh -X GET.
//
// Usage: fetch-item.js --number <n> [--repo <owner/name>]
// Emits JSON: { number, type, url, title, author, state, is_draft, created_at,
//   updated_at, labels, body, comments:[...], (pr:) base_sha, changed_files, additions, deletions }

'use strict';
const { ghApi } = require('./gh');
const { repository } = require('./config');

function parse(argv) {
  const o = { repo: repository };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--number') o.number = argv[++i];
    else if (argv[i] === '--repo') o.repo = argv[++i];
  }
  return o;
}

const o = parse(process.argv.slice(2));
if (!o.number) { console.error('fetch-item: missing --number'); process.exit(1); }

async function main() {
  const issue = await ghApi(`repos/${o.repo}/issues/${o.number}`);
  const isPr = !!issue.pull_request;

  const out = {
    number: issue.number,
    type: isPr ? 'pr' : 'issue',
    url: issue.html_url,
    title: issue.title,
    author: issue.user && issue.user.login,
    state: issue.state,
    is_draft: false,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    labels: (issue.labels || []).map((l) => (typeof l === 'string' ? l : l.name)),
    body: issue.body || '',
    comments: [],
  };

  try {
    const comments = await ghApi(`repos/${o.repo}/issues/${o.number}/comments`, { fields: { per_page: '100' }, paginate: true });
    out.comments = comments.map((c) => ({ author: c.user && c.user.login, created_at: c.created_at, body: c.body || '' }));
  } catch (e) {
    console.error(`fetch-item: comments_error: ${e.message}`);
    process.exit(1);
  }

  if (isPr) {
    try {
      const pr = await ghApi(`repos/${o.repo}/pulls/${o.number}`);
      out.is_draft = !!pr.draft;
      out.base_sha = pr.base && pr.base.sha;
      out.base_ref = pr.base && pr.base.ref;
      out.head_sha = pr.head && pr.head.sha;
      out.changed_files = pr.changed_files;
      out.additions = pr.additions;
      out.deletions = pr.deletions;
      out.requested_reviewers = (pr.requested_reviewers || []).map((r) => r.login);
    } catch (e) {
      console.error(`fetch-item: pr_error: ${e.message}`);
      process.exit(1);
    }
  }

  console.log(JSON.stringify(out, null, 2));
}

main().catch((error) => { console.error(`fetch-item: ${error.message}`); process.exit(1); });
