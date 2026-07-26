#!/usr/bin/env node
// classify-repo.js — enforce the orbit boundary for ONE repo, by its own evidence
// (MAINTAINING.md rule 7; workflow/DESIGN.md, "Analysis"). Ownership is never the
// test. Signals, strongest to weakest:
//   - the watched repository itself, or a fork of it        (admits)
//   - description or topics name it by a PROPER name from steward.json's
//     orbit.names (never list a bare generic word there)     (admits)
//   - a recent item in the watched repository links to it (pass --linked if
//     scan-links found it)                                   (admits)
//   - manifest declares orbit.packages         (LEAD only — needs a second look)
// A manifest-only candidate is admitted only if a brief evidence check corroborates
// a genuine tie; otherwise it drops, and the drop is counted. Ambiguous => drop
// (privacy-first).
//
// Usage: classify-repo.js --repo <owner/name> [--linked]
// Emits JSON: { repo, admit, signals:[...], needs_second_look, reason }

'use strict';
const { ghApi } = require('./gh');
const { repository, orbit } = require('./config');

function parse(argv) {
  const o = { linked: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--repo') o.repo = argv[++i];
    else if (argv[i] === '--linked') o.linked = true;
  }
  return o;
}

const o = parse(process.argv.slice(2));
if (!o.repo) { console.error('classify-repo: missing --repo'); process.exit(1); }

const TARGET = repository.toLowerCase();
const PROPER_NAMES = orbit.names.map((n) => n.toLowerCase());
const ORBIT_PKG = orbit.packages ? new RegExp(orbit.packages, 'i') : null;

async function main() {
  const signals = [];
  let needsSecondLook = false;

  // 1. the watched repository itself or a fork of it
  if (o.repo.toLowerCase() === TARGET) {
    signals.push('is-target');
  } else {
    let repo;
    try { repo = await ghApi(`repos/${o.repo}`); }
    catch (e) {
      console.log(JSON.stringify({ repo: o.repo, admit: false, signals: [], needs_second_look: false, reason: `metadata unavailable: ${e.message}` }));
      process.exit(0);
    }

    if (repo.fork) {
      const parent = (repo.parent && repo.parent.full_name || '').toLowerCase();
      const source = (repo.source && repo.source.full_name || '').toLowerCase();
      if (parent === TARGET || source === TARGET) signals.push('fork-of-target');
    }

    // 2. description / topics name the project by a proper name
    const hay = `${repo.description || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();
    if (PROPER_NAMES.some((n) => hay.includes(n))) signals.push('proper-name-in-metadata');

    // 3. link signal (only if the caller's scan-links derived it)
    if (o.linked) signals.push('linked-from-target');

    // 4. manifest declares the project's packages — LEAD only
    let manifestDeclares = false;
    if (ORBIT_PKG) {
      try {
        const pkg = await ghApi(`repos/${o.repo}/contents/package.json`, { headers: ['Accept: application/vnd.github.raw'] });
        const text = typeof pkg === 'string' ? pkg : Buffer.from(pkg.content || '', 'base64').toString('utf8');
        if (ORBIT_PKG.test(text)) manifestDeclares = true;
      } catch { /* no package.json is fine */ }
    }
    if (manifestDeclares) {
      signals.push('manifest-declares-packages');
      // Manifest alone is the weakest signal: a lead, never an admission by itself.
      const strongOthers = signals.some((s) => s !== 'manifest-declares-packages');
      if (!strongOthers) needsSecondLook = true;
    }
  }

  // Admission rule: any signal other than a bare manifest admits. A manifest-only
  // candidate is held for a second look (the model corroborates), not auto-admitted.
  const strong = signals.filter((s) => s !== 'manifest-declares-packages');
  const admit = strong.length > 0;
  const reason = admit
    ? `admitted by: ${strong.join(', ')}`
    : (needsSecondLook
        ? 'manifest-only lead — needs a corroborating second look before admission'
        : 'no admitting signal — dropped (privacy-first)');

  console.log(JSON.stringify({ repo: o.repo, admit, signals, needs_second_look: needsSecondLook, reason }, null, 2));
}

main().catch((error) => { console.error(`classify-repo: ${error.message}`); process.exit(1); });
