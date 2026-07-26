#!/usr/bin/env node
// recent-commits.js — what landed on the default branch since a recorded position.
// The triage subagent's one upstream read. A staleness verdict records the codebase
// position it was judged against (default-branch.js emits "<branch>@<short-sha>");
// when the branch has moved past it, triage asks only "did anything land that
// plausibly touches this item?" and needs the commits and the touched paths to say.
//
// This exists because triage used to reach upstream through a bare `gh api -X GET`.
// It now goes through a script like every other upstream read, so the whole steward
// has exactly one way out: gh.js, GET-only, api.github.com only.
//
// --after <sha> uses the compare endpoint, which returns the commits AND the union
// of changed files in one call — the shape the staleness question actually wants.
// --since <ISO date> falls back to the commits listing when there is no recorded sha.
//
// Usage: recent-commits.js [--repo <owner/name>] (--after <sha> | --since <ISO>) [--max 50]
// Emits JSON: { branch, base, count, truncated, files:[path...], commits:[{sha,date,author,message}] }

'use strict';
const { ghApi } = require('./gh');
const { repository } = require('./config');

function parse(argv) {
  const o = { repo: repository, max: 50 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--repo') o.repo = argv[++i];
    else if (argv[i] === '--after') o.after = argv[++i];
    else if (argv[i] === '--since') o.since = argv[++i];
    else if (argv[i] === '--max') o.max = parseInt(argv[++i], 10);
  }
  return o;
}

const o = parse(process.argv.slice(2));
if (!o.after && !o.since) {
  console.error('recent-commits: need --after <sha> or --since <ISO date>');
  process.exit(1);
}

// A position is written "<branch>@<short-sha>"; accept either that or a bare sha.
function shaOf(position) {
  const at = String(position).lastIndexOf('@');
  return at === -1 ? String(position) : String(position).slice(at + 1);
}

function summarise(commit) {
  return {
    sha: (commit.sha || '').slice(0, 7),
    date: commit.commit && commit.commit.author && commit.commit.author.date,
    author: (commit.author && commit.author.login) || (commit.commit && commit.commit.author && commit.commit.author.name),
    // First line only: a commit body is untrusted data and triage needs the subject.
    message: ((commit.commit && commit.commit.message) || '').split('\n')[0],
  };
}

async function main() {
  const repo = await ghApi(`repos/${o.repo}`);
  const branch = repo.default_branch;

  if (o.after) {
    const base = shaOf(o.after);
    const diff = await ghApi(`repos/${o.repo}/compare/${base}...${branch}`);
    const commits = (diff.commits || []).slice(-o.max).map(summarise);

    console.log(JSON.stringify({
      branch,
      base,
      count: diff.total_commits != null ? diff.total_commits : commits.length,
      // The compare endpoint caps at 250 commits and 300 files; say so rather than
      // let a partial answer read as a complete one.
      truncated: (diff.total_commits || 0) > commits.length || (diff.files || []).length >= 300,
      files: (diff.files || []).map((f) => f.filename),
      commits,
    }, null, 2));
    return;
  }

  const listed = await ghApi(`repos/${o.repo}/commits`, {
    fields: { sha: branch, since: o.since, per_page: String(Math.min(o.max, 100)) },
  });
  const commits = listed.map(summarise);

  console.log(JSON.stringify({
    branch,
    base: o.since,
    count: commits.length,
    truncated: commits.length >= Math.min(o.max, 100),
    files: [],
    commits,
  }, null, 2));
}

main().catch((error) => { console.error(`recent-commits: ${error.message}`); process.exit(1); });
