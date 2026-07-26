#!/usr/bin/env node
// config.js — steward.json, the project's identity: which repository the steward
// watches, who is on the roster, what admits a repo to the orbit.
// SIBLING COPIES: intentionally duplicated per skill so each skill's allowed-tools
// sandbox stays confined to its own scripts/. Keep identical to
// analysis/scripts/config.js — edited together or not at all.
//
// IDENTITY ONLY — "who and where", never "what is acceptable". Policy (the PR cap,
// the silence threshold, every judgment the steward makes) lives in CONTRIBUTING.md
// as prose, by design. Never move a rule into this file.
//
// Loading throws rather than defaulting: a steward silently watching the wrong
// repository is worse than one that refuses to start.

'use strict';
const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '..', '..', '..', '..', 'steward.json');

function load() {
  let raw;
  try { raw = fs.readFileSync(FILE, 'utf8'); }
  catch { throw new Error(`steward.json not found at ${FILE}`); }

  let cfg;
  try { cfg = JSON.parse(raw); }
  catch (e) { throw new Error(`steward.json is not valid JSON: ${e.message}`); }

  if (typeof cfg.repository !== 'string' || !cfg.repository.includes('/')) {
    throw new Error('steward.json: "repository" must be an "owner/name" string');
  }
  if (!Array.isArray(cfg.roster) || cfg.roster.length === 0) {
    throw new Error('steward.json: "roster" must be a non-empty array of GitHub logins');
  }

  const orbit = cfg.orbit || {};
  return {
    repository: cfg.repository,
    roster: cfg.roster,
    orbit: {
      names: orbit.names || [],
      packages: orbit.packages || null,
    },
  };
}

const config = load();

module.exports = config;

// Run directly to print the resolved config as JSON. The skills read the roster
// this way: steward.json is not in any skill's Read allowlist, but every skill
// already runs its own scripts/*.js.
if (require.main === module) console.log(JSON.stringify(config, null, 2));
