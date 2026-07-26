#!/usr/bin/env node
// default-branch.js — the current default-branch position, for staleness re-verify.
// A staleness verdict records the codebase position it was judged against; the
// sweep re-verifies when the branch has moved past it. Read-only: gh -X GET.
//
// Usage: default-branch.js [--repo <owner/name>]
// Emits JSON: { branch, sha, position }   (position = "<branch>@<short-sha>")

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
  const repo = await ghApi(`repos/${o.repo}`);
  const branch = repo.default_branch;
  const head = await ghApi(`repos/${o.repo}/commits/${branch}`, { fields: { per_page: '1' } });
  const sha = head.sha;

  console.log(JSON.stringify({ branch, sha, position: `${branch}@${sha.slice(0, 7)}` }, null, 2));
}

main().catch((error) => { console.error(`default-branch: ${error.message}`); process.exit(1); });
