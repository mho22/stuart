# workflow/DESIGN.md — Design of the Steward's Machinery

*This document designs the machinery that enforces the rulebooks: the problem and goals, the requirements, the repository layout, the identity file, the two workflows, the prompt structure, the store, the skills, the message and report formats, the state, and the cost controls. It is the companion of guidelines/DESIGN.md (which designs the rulebooks themselves); either can change without touching the other. The rulebooks — CONTRIBUTING.md and MAINTAINING.md — are tuned by maintainers; this document evolves with the code. BRAINSTORMING.md is the frozen pre-design record; this document is authoritative for everything about the machinery, and decisions made after the brainstorm are recorded here, never by rewriting it.*

## The problem and the goals

Issues and pull requests are now mostly written with or by AI. Generating them is nearly free; reviewing them is not — the scarce resource is human review attention, and in wordpress-playground it is measurably losing: 441 open issues, 78% untouched since before 2026, 107 open PRs, most of the review load internally generated (the numbers and their reading: BRAINSTORMING.md, "What the data says"). The steward exists to absorb that load without becoming the hated stale-bot.

The experiment has two goals, each observable:

1. **Rehearsals worth posting.** Sampled messages accumulate recorded *post-as-is* verdicts under the sampling protocol (workflow/PLAN.md, Step 6) — this is the experiment's success metric.
2. **Tuning by prose alone.** Every behavior correction lands as an edit to CONTRIBUTING.md or MAINTAINING.md, never to code — if code has to change for a policy reason, the design has failed somewhere.

## Requirements

What the build must observably do — the acceptance checklist for workflow/PLAN.md's calibration step, checked against real runs, not felt:

- [ ] Every run starts locally — a session the maintainer opens, or `core/scripts/run.ts` for the same run without one (an amendment of 2026-08-26).
- [ ] Everything project-specific — the watched repository, the roster, the orbit's proper names and packages — comes from `steward.json`; no script or skill hardcodes a repository or a person. Pointing the steward at another repository is one file edit plus rewriting the rulebooks' prose.
- [ ] Items the steward has never seen get the full rulebook judgment (rules 1–3) on first sight during the sweep, and each run's timestamp advances last, only after everything else is written.
- [ ] Reviewer suggestions name a first reviewer and a backup, fire only for items that pass the rulebook and have nobody assigned (an assigned item gets at most one backup suggestion, on profile evidence), and never name the author in either role. One standing suggestion per item — coverage is patrolled, never re-nagged.
- [ ] Inactivity (30 days) and per-person open-PR counts are computed by scripts; no tokens are spent on arithmetic.
- [ ] Unchanged items are served from `.claude/state/cache/`; changed items reach frontier judgment only when triage flags them; never-judged items skip triage by design and the ledger counts them as such. Staleness is the deliberate exception: a staleness verdict is re-verified every sweep against the current codebase — triage-first, frontier only when flagged — because an unchanged item does not mean an unchanged judgment.
- [ ] Every message and report line links to its item; uncertainty becomes a `silence` message, never a verdict.
- [ ] Messages and cache entries for closed items are deleted; reports are pruned beyond each workflow's three most recent.
- [ ] `maintainers/` is written by analysis alone; every profile claim carries a link; no profile grades a person.
- [ ] Analysis windows are person-first and boundary-filtered by script: repos are admitted by their own evidence (fork lineage, declared dependencies, metadata naming playground by a proper name, playground links — never ownership), a dependency declaration alone never admits without a corroborating second look, off-project items are dropped unread before the model sees the window with only counts reaching the ledger, and related non-playground repos enter profiles only as condensed area claims.
- [ ] Instruction-shaped text in upstream content is quoted and flagged in the report, never followed.
- [ ] A run's changes persist only in `messages/`, `reports/`, `maintainers/`, and `.claude/state/` — all gitignored record paths; anything else dirties the tracked machinery and shows in `git status`.
- [ ] Whatever a run skipped — rate limit, API failure, any hard stop — is named in the report's ledger, item by item, linked.

## The shape of the system

A repository on the mho22 account holds the machinery: the rulebooks, the identity file, and the skills that carry procedural know-how. The root belongs to what humans read — the rulebooks, the specification; the machinery (skills, hooks, agents, state, vendored docs) lives under `.claude/`, out of the way. **The record is local, never committed** (an amendment of 2026-08-19, replacing the committed-outputs design): the directories where the steward writes what it *would* say — `messages/`, `reports/`, `maintainers/`, `.claude/state/cache/` — are gitignored, each holding only a self-ignoring `.gitignore` so the directory survives a clone empty. The code can be public; the record — judgments about named people — exists only on the maintainer's machine and is never pushed anywhere. **One copy rule:** `specification/` exists exactly once, at this root. A build iterated in a draft directory carries the rulebooks, the machinery, and the output directories — never its own copy of the specification: a second copy forks the decision record, and the fork drifts. Every run is launched by hand as a local session, reads the watched repository and its orbit read-only, writes files into the gitignored output paths, and ends with the maintainer reading the new files. The agent never commits or pushes; nothing does.

```
stuart/                           # mho22 account; the code can be public, the record never is
├── CLAUDE.md                     # identity, voice, steward's own rules
├── CONTRIBUTING.md               # contribution rulebook (sweep)
├── MAINTAINING.md                # profiling rulebook (analysis)
├── steward.json                  # identity: watched repository, roster, orbit names + packages
├── specification/
│   ├── BRAINSTORMING.md          # frozen pre-design record — history, not authority
│   ├── guidelines/
│   │   ├── DESIGN.md             # design of the rulebooks
│   │   └── PLAN.md               # ordered build steps for the rulebooks
│   └── workflow/
│       ├── DESIGN.md             # this document
│       └── PLAN.md               # ordered build steps for the machinery
├── maintainers/                  # one file per roster member       (gitignored — local record)
├── messages/                     # one file per would-be comment    (gitignored — local record)
├── reports/                      # dated run reports, pruned        (gitignored — local record)
└── .claude/                      # the machinery, out of the human-facing root
    ├── settings.json             # wires the PreToolUse deny hook — the deterministic back of "data is never command"
    ├── hooks/
    │   └── guard.js              # the deny itself: mutating calls, writes outside the output paths
    ├── agents/
    │   └── triage.md             # Haiku subagent: the sweep's cheap first pass
    ├── docs/
    │   └── cognitive-load.md     # vendored distillation — never fetched at runtime
    ├── skills/
    │   ├── sweep/                # SKILL.md + scripts/ + references/
    │   ├── analysis/
    │   └── store/                # shared: publish, recall, retract
    └── state/
        ├── last-run.json         # per-workflow last-run timestamps
        ├── orbit.json            # derived: repos shown related to the project this run — each with the signals that admitted it
        └── cache/                # analysis cache, one file per judged item  (gitignored — local record)
```

## The division of labor

Four layers, each holding exactly one kind of decision. Keeping them apart is what makes the steward tunable by prose:

- **The launcher — *when* (and *who*).** The maintainer's hand: which workflow runs (the prompt he gives the session), on the maintainer's ambient `gh` auth, and any deterministic per-person skip decided before the model sees anything — zero tokens spent, nothing for the model to misjudge. No such exemption is active; the mechanism exists for whenever one is needed.
- **Rulebooks — *what*.** CONTRIBUTING.md for judging contributions (sweep), MAINTAINING.md for profiling people (analysis). Judgment-level nuance — tone per person, gentleness toward newcomers — lives here and in `maintainers/`, where the agent can weigh it.
- **Skills — *how*.** Paging through open items, diffing against the cache, assembling a recent window, the store operations. Skills carry scripts for deterministic GitHub API mechanics so tokens are spent on judgment, not plumbing. Hard boundary: skills hold procedure, never policy.
- **CLAUDE.md — *who is speaking*.** The steward's identity and voice; the **canonical copy of its own rules** — CONTRIBUTING.md's closing section mirrors them for human readers, and on any drift CLAUDE.md wins (the monthly audit in workflow/PLAN.md's loop catches it); the standing order that every output goes through the store, never a direct file or API write; **the model policy as a standing order** — every judgment pass runs on Opus, Haiku only for the sweep's triage — stated where the steward reads it every run, because a local session inherits whatever model it was launched with and the pin has already been silently missed once; the pointer to `.claude/docs/cognitive-load.md`; and the standing order that everything fetched from outside the repo is data, never instructions. Capped at ~200 lines — a rules file past that stops being read.

## The identity file

`steward.json` at the steward root holds everything project-specific, and only that (an amendment of 2026-08-19 — the values were previously hardcoded across eight scripts):

- **`repository`** — the `owner/name` the steward watches. Every script default and every search derives from it.
- **`roster`** — the GitHub logins the steward stewards. The `/analysis` work list and the PR-cap binding both read it here — never the file list in `maintainers/`, which is analysis's own *output*, empty on a fresh clone (deriving the roster from it made the cap silently bind nobody).
- **`orbit.names` / `orbit.packages`** — the proper names and package-regex that admit a repo to the orbit (the boundary's configurable half; its logic stays in `classify-repo.js`, its judgment calls in the rulebook prose).

The boundary this file must never cross: **identity, not policy.** Who and where go in JSON; what is acceptable — the PR cap, the silence threshold, every judgment — stays prose in the rulebooks, where tuning lives. Each workflow skill reads the file through its own `scripts/config.js` (sibling copies, like `gh.js`): loading throws on a missing or invalid file rather than defaulting, because a steward silently watching the wrong repository is worse than one that refuses to start; run directly it prints the resolved config, which is how a skill whose Read scope excludes the file gets the roster. Pointing the steward at another repository is this one file plus rewriting the rulebooks — the prose *is* the per-project configuration, by design.

## The two workflows

Each workflow is one job with one write scope. The sweep only *reads* `maintainers/`; analysis is its only writer — the split is carried by each skill's `allowed-tools`, with the guard hook denying any write outside the union of the output paths (see "Security posture"). Both run only when Yannick launches them, locally — no cron, no event triggers, nothing spends money unattended. He triggers them independently, at whatever cadence he likes — dense runs are cheap on the subscription and accumulate verdict evidence faster than any calendar; running analysis before a sweep freshens the reviewer picture, and skipping it just means slightly older knowledge, never an error.

*(An amendment of 2026-08-19 dissolves the third workflow, **intake**, into the sweep. Intake simulated one webhook delivery per run — the newest never-intaken item, judged as if GitHub had just delivered it — with reviewer suggestion gated creation-only so the backlog was never mass-assigned. Both premises died when the record went private-by-design: no webhook will ever arrive, so "newly created" is not a moment the steward can act on, and a first-sight judgment during the patrol is the same judgment at the same cost. The sweep now judges never-seen items in full (rules 1–3) and patrols review coverage (rule 7) across the backlog — bounded not by creation time but by one standing suggestion per item.)*

### Sweep

Patrols everything open. Its script lists all open issues and PRs with last-activity and assignment data, then splits the work:

- **Deterministic math first, free.** Inactivity is timestamp math, not judgment: the script computes which items crossed 30 days of silence — and drops the ones whose standing reminder is still the thread's last word (rule 5: one reminder is enough; the steward already did its job, and only new human activity re-arms the clock). This yields the *candidate* set only; whether each candidate actually earns a reminder waits on the staleness call below (rule 6), so an obsolete item is never nudged to keep waiting. The PR-cap nudge (rule 4) is computed here too, from open non-draft counts per roster member (the roster: `steward.json`). Drafts are included.
- **First sight is the full judgment.** A `never_judged` item is the steward's first look at it, so it gets what a webhook delivery once got: the rulebook in full (rules 1–3 — too many stories, no testing evidence, no reproduction, unowned AI output), concerns becoming one would-be message where the most important concern leads and the rest wait.
- **Review coverage (rule 7), after judgment.** For each item left standing with no open concerns: nobody assigned and no standing suggestion means a `reviewer` message naming two people — first reviewer and availability backup, continuity weighed against load from `maintainers/`, never the author. Somebody assigned means a fit check as facts, never a grade: a good assignment gets no message; a profile with no tie to the area, or an over-cap assignee, gets one backup suggested as help with load, evidence linked; unsure means silence, said out loud. One standing suggestion per item — coverage is patrolled, never re-nagged.
- **Staleness judgment, before the reminder — cache-assisted.** Staleness (rule 6) needs the model — and a staleness verdict is a judgment against the *current codebase*, not only against the item, so the item being unchanged never makes the verdict permanent: an issue judged "not stale" in July must not stay that way forever just because nobody commented, while the fix quietly lands in December. Every sweep therefore re-verifies standing staleness verdicts: each entry records the upstream default-branch position it was judged against, and when the codebase has moved since, the entry goes back through triage — "did anything land that touches this item?" — with the frontier model re-judging only what triage flags. Changed and never-judged items follow the same triage-first path. What stays free is everything the codebase question doesn't reach: an unchanged item whose staleness entry survives triage costs nothing, and the non-staleness kinds keep the plain unchanged-means-served cache economy. Only once this call is made does the model write the reminder — the human part, reading the thread to see who a still-live item actually waits on (rule 5) — and only for candidates the staleness call left standing; an item found stale, or written as a `silence`, carries that message instead.
- **Housekeeping.** Messages whose target item has closed are deleted — `messages/` always shows current beliefs; there is no archive, by design (the record is local and uncommitted). Reports older than the three most recent are pruned the same way.

**Run in full.** The first sweep is a full sweep over the whole open backlog — every open item judged, batched only for judgment quality (never a pilot batch, a sample, or a run gated behind a confirmation). It is the most expensive run by design; the cache then makes every later run only the delta it did not already serve. A hard stop (rate limit, API failure) is the only thing that ever splits it across runs, and the cache resumes it exactly where it stopped.

Writes: `messages/`, the sweep report, cache entries, its timestamp.

### Analysis

Reads people, under MAINTAINING.md — the most sensitive job, so the narrowest one.

**The window is assembled person-first** (an amendment of 2026-07-28). For each roster member, the script makes three global searches — items they authored, PRs they reviewed, threads they were pulled into — over the recent window, never a complete history. Person-first is both the honest direction (it finds what the person actually did, wherever around playground they did it — including related work no playground thread happens to link) and the cheap one (three searches per member covers the whole roster). Three is the baseline, not a ceiling: when the window comes back thin or a thread clearly continues past what the baseline fetched, the run searches further — follow-ups allowed and counted in the ledger like everything else (an amendment of 2026-07-29: a run once needed nine extra searches and had to disclose them as a deviation; the deviation is now the rule). The boundary rules below apply to everything a follow-up returns, exactly as to the baseline.

**The boundary is enforced before the model sees anything.** The orbit is what the evidence shows related to playground; everything else is dropped unread. Each distinct repository in the raw window is classified mechanically, by the repo's own evidence:

- It is playground itself, or a fork of it.
- Its manifest declares playground packages.
- Its description or topics name playground by a proper name — wordpress-playground, wp-playground, php-wasm. The bare word "playground" names half of GitHub and never admits.
- Recent playground items link to it (the SQLite integration repo remains the canonical example).

Three rules govern the signals:

- **A signal is only as real as its derivation.** The link signal exists only where a script actually scans recent playground items for cross-repo links — until that scan runs, the signal is inactive, the ledger says so, and no repo is admitted on a signal nobody computed.
- **The signals are not equal.** A manifest declaration alone is the weakest — any repo that merely *uses* playground carries one, which makes it a lead, never an admission. A manifest-only candidate gets a brief evidence check — description, topics, what its recent activity actually touches — and is admitted only if that look corroborates a genuine tie; otherwise it drops, the drop counted (an amendment of 2026-07-29: admissions feed profile claims, so the admit side must be as careful as the drop side).
- **Ownership is never the test.** A personal repo can be deeply related — a maintainer's playground fork, a Blueprints step library, a Playground-backup importer — while an org repo can be noise.

A repo no signal admits is a personal or unrelated project: its items never reach the model, never appear in any output, and the ledger records only how many were dropped, never which. When the signals are ambiguous the default is to drop, privacy-first, with the drop counted. This is rule 7 enforced at the reading layer, where it always really lived: no off-project research about a person, ever.

**The two scopes are read at different depths.** Playground is the subject: each member's window there enters the profile in full — authored, reviewed, involved. A related repo is context, not a second subject: its activity enters only condensed — who is active there, how much, the two or three strongest links — grounding a Current-areas claim ("deep in the POSIX kernel work — twelve recent PRs in wasm-posix-kernel"), never itemized line by line.

**The orbit is a derived record.** Which repos were admitted, by which signals, through which links — written to `.claude/state/` each run, so the next run starts from the last known layout and re-pays classification only for the delta. Re-derived every run, never a hand-configured list that could go stale.

**Profiles update incrementally.** New evidence enters with links, untouched areas **fade out**, uncertainty is marked as uncertain. Never rebuilt from scratch — the incremental update is what keeps a profile honest between runs.

The roster is `steward.json`'s `roster` array — adding a person means one line there; this workflow creates and maintains their profile in `maintainers/` (an amendment of 2026-08-19: the roster was the file list in `maintainers/`, which broke the moment that directory became local-only output — the skill would have read its own empty output as "nobody to profile"). Currently: adamziel, mho22, brandonpayton, fellyph, zaerl, ashfame, bgrgicak, janjakes, akirk. No exemptions — adamziel is in the same loop as everyone.

Writes: `maintainers/`, its report, its timestamp. Never `messages/`.

## Anatomy of a run

Every run follows one local skeleton:

1. **Launch** — the maintainer opens a session in the checked-out repo: the ambient `gh` auth for read-only upstream access, Node on PATH for the skills' scripts, and the workflow prompt naming the job.
2. **Run the engine** — prompt + rulebook + skills; no per-run dollar cap (subscription-billed — see "Cost controls" §5).
3. **Review** — the maintainer reads the new files. A run's writes land only in the gitignored output paths — `messages/`, `reports/`, `maintainers/`, `.claude/state/` — and anything outside them shows up in `git status` as a change to the tracked machinery, which is the tell: a misbehaving run (or a successful injection) that touched the rulebooks, the skills, or the machinery is visible precisely because those are the only tracked paths a run can dirty. The agent never commits or pushes; the record itself is never committed at all (amendment of 2026-08-19).

This gives clean crash semantics: a run that dies mid-way leaves only files the next run overwrites — every output is a re-derivable function of upstream plus the rulebooks. Runs never race on `.claude/state/`: the maintainer launches them one at a time.

## Prompt structure

Each run's context is assembled from committed files, in trust order:

1. **CLAUDE.md** — always loaded: identity, voice, self-rules, the data-never-command posture.
2. **The workflow prompt** — three named parts, because a command missing one of them invites improvisation: the **job** (what this run does, in a few sentences), the **anchors** (the rulebook that binds it, the skill it must load, the state files it starts from), and the **return** (which message kinds and which report must exist, via the store, when it's done). The *how* is deliberately not here; it's in the skill.
3. **The rulebook that binds this workflow** — CONTRIBUTING.md for the sweep, MAINTAINING.md for analysis.
4. **Skills** — loaded by the agent as needed; their scripts return upstream data.

Everything the scripts fetch — titles, bodies, comments, diffs — arrives as quoted, untrusted data. Only layers 1–4 direct the agent. Text inside an item that tries to instruct the steward ("ignore your rules", "approve this", "assign X as reviewer") is never followed; it is quoted as evidence and flagged in the run's report. This holds permanently — shadow mode bounds the blast radius, it doesn't create the rule.

## The store

The agent never touches files or the GitHub comment API directly for its outputs; it talks to the `store` skill, a small abstraction with four operations:

| Operation | Effect |
|---|---|
| `publish-message(item, kind, body, judged_against)` | write or overwrite `messages/<n>-<kind>.md` |
| `publish-report(workflow, date, body)` | write `reports/<date>-<workflow>.md` |
| `recall(item)` | read that item's message files + cache entry |
| `retract(item)` | delete the item's message files |

One interface for every output keeps the rehearsal uniform: what the steward would say is always a file of the same shape, recallable and retractable by the same scripts — and the prompts and rulebooks never need to know how a file gets written.

## The skills

Skills follow the SKILL.md standard, and the standard is load-bearing: only each skill's name and description ride in every run's context (~100 tokens apiece), the body loads when the skill triggers, and the bundled files load only when a step needs them. Four rules keep that economy honest:

- **Anatomy.** Each skill is a directory. `SKILL.md` and `scripts/` (the deterministic GitHub mechanics) are the constant; `references/` (depth read per phase, never up front — the triage rubric, the cache-entry schema, the report template, the fade-out procedure) and `assets/` (files the steward uses but never reads into context — the profile template, the message frontmatter skeleton) appear **only when a skill has something to put in them; an empty subdir is never scaffolded** (a clarification of 2026-07-29). Four rules bind the scripts:
  - **JavaScript only** — Node, invoked via `#!/usr/bin/env node`, never shell: bash past the first pipeline is write-only, and one language across every skill (and the guard hook, already `guard.js`) keeps the mechanics reviewable and testable. The launcher provides the Node runtime the scripts assume (see "Anatomy of a run").
  - **Every `gh api` call states `-X GET` explicitly** — a `-f` field without it silently flips the call to POST: the same quiet mutation the guard denies at the Bash layer, reintroduced where the guard cannot see it, inside a script.
  - **`.claude/skills/` is the home** — `.agents/skills/` is the recorded portability option if the engine ever swaps to a non-Claude runner; noted, not taken.
  - **Shared scripts are duplicated, except the store's.** A script two skills both need (`gh`, `config`, `update-timestamp`) is deliberately duplicated into each — `allowed-tools` confines a skill to its own `scripts/`, so sharing would mean widening the sandbox — with a header note in every copy naming its siblings, so they are edited together or not at all. The store's scripts are the one deliberate exception: publishing is their job, so every workflow skill's `allowed-tools` grants them alongside its own (see "Frontmatter") — the shared output interface is shared on purpose, never duplicated.
- **Frontmatter.** `name` matching the directory name; a `description` that states when the skill fires *and when it doesn't*; `allowed-tools` cutting each skill to its own scripts, the store's scripts, and its write scope — the skill-level layer of the security posture: `store` gets its scripts plus writes under `messages/` and `reports/`; `analysis` its own and the store's scripts, read-only upstream, plus writes under `maintainers/`; `sweep` its own and the store's scripts, read-only upstream, publishing only through `store`. Publishing *through* the store means *calling* the store's scripts: a workflow skill whose `allowed-tools` stops at its own `scripts/` cannot publish at all.
- **Descriptions are triggers.** With all three in context every run, each description must make the right one unambiguous — stating its when *and* its when-not: *sweep* — "patrol all open items: first-sight judgment, review coverage, reminders, cap nudges, staleness, housekeeping; the one workflow that works the backlog"; *analysis* — "update `maintainers/` profiles from a recent activity window; the single writer of `maintainers/`"; *store* — "publish, recall, or retract any steward output; never for reading upstream".
- **Bodies.** Job, anchors, return — the same shape as the workflow prompts — under ~5k tokens, with exact script invocations rather than paraphrases, and a short troubleshooting note per known failure (rate limit hit, hard-stop resume via the cache, a cache entry whose messages are gone). Anything deeper moves to `references/`.

## Message formats

One file per would-be comment: `messages/<number>-<kind>.md`, where `<number>` is the upstream issue/PR number (issues and PRs share one number space) and `<kind>` is one of `concerns`, `reviewer`, `reminder`, `cap`, `staleness`, `silence`. Overwritten on re-evaluation, deleted when the item closes — the directory is the steward's current beliefs, and its only record.

A small frontmatter block records provenance — `context`, optional, is one line quoting the thread comment the message answers, so the record shows what it responds to (an amendment of 2026-08-20); the body below it is the comment **verbatim**, exactly what would be posted:

```markdown
---
item: https://github.com/WordPress/wordpress-playground/pull/2905
kind: reviewer
workflow: sweep
run: 2026-07-26
judged_against: 2026-07-25T18:40:12Z   # the item's updated-at at judgment time
context: '@contributor, 2026-07-24: "Rebased on trunk, ready for another look."'
---
Thanks for this, @contributor — it's a clean single story and the Blueprint
made it easy to verify. I'd suggest @bgrgicak as reviewer: they reviewed the
two most recent PRs touching the service worker ([#2841], [#2867]) and
currently carry the lightest open load on the roster. If they can't take it,
@brandonpayton is the natural backup — they reviewed the service-worker
registration rework in [#2790].
```

The body obeys the steward's own rules: one story, the point first, evidence in a few sentences, every reference linked, stop. **Silence notes are messages like any other** — kind `silence`, body "I'm staying silent here: I'm not sure whether …" — so uncertainty is browsable in the same place as verdicts, never disguised as one.

## Reports

One per run: `reports/<date>-<workflow>.md`. A report is written for a maintainer with two minutes, so it leads with the few lines that matter and links every item it names:

1. **Worth your attention** — the handful of judgments made this run, one line each, linked.
2. **Silences** — items the steward declined to judge, with its stated uncertainty.
3. **Flags** — any content that attempted to instruct the steward, quoted.
4. **Ledger** — items scanned / served from cache / judged / skipped by budget.

Anything a hard stop forced the run to skip is named here — silent truncation would read as "covered everything" when it didn't. Each workflow prunes reports beyond its three most recent; pruned reports are gone (the record is local and uncommitted).

## State and the analysis cache

Two kinds of local state, both small, both re-derivable:

- **`.claude/state/last-run.json`** — one timestamp per workflow, written at the end of each successful run: the record that lets the two workflows run on independent cadences and each report name its span. What needs judgment is defined by the cache diff against `messages/` and the cache, never by this timestamp.
- **`.claude/state/cache/<number>.json`** — one entry per judged item: what it was judged against (its updated-at timestamp — for PRs too: a push bumps updated-at just like a comment, so one key catches new code and new discussion alike, where a head SHA would miss a decisive comment), when, which messages resulted, and a one-line verdict summary. A staleness verdict additionally records the upstream default-branch position it was judged against: staleness is a judgment about the codebase, not only the item, so `updated_at` alone can never keep it fresh — the sweep re-verifies it every run (see "Sweep"). The sweep's diff against these entries is why unchanged items cost nothing on every other question. Entries for closed items are deleted alongside their messages.

The state is plain local files, never an evictable external cache: evictable means amnesia (`cache/` is gitignored like the rest of the record; `last-run.json` and `orbit.json` stay tracked as small machinery state). The invariant holds throughout: state is a rebuildable derivation of GitHub history plus the rulebooks, never an authoritative record — losing all of it costs a re-derivation, not a loss.

**`updated_at` is broader than "a human spoke."** It also bumps on label changes and bot actions, which are not a human speaking (rule 5) — a due item whose only news is a label or a bot is still standing: the sweep refreshes its key and adds no new word.

## Cost controls

Layered, cheapest first — each layer only pays for what the previous one couldn't rule out:

1. **Nothing runs by itself.** Manual triggers are the first control: a forgotten experiment costs zero.
2. **Scripts before tokens.** Listing, diffing, timestamp math, window assembly — all deterministic, all in skill scripts.
3. **The analysis cache.** Unchanged items are never re-judged — with one deliberate exception: staleness re-verifies every sweep through triage, because the codebase moves even when the item doesn't (see "Sweep"). That re-verification stays triage-priced by design; the frontier pays only where triage finds the ground shifted. This cache is still the main lever for sweeping hundreds of items: after the first full sweep, a typical run's frontier spend is only the week's delta.
4. **Cheap-model triage.** Changed items get a cheap first pass from the `triage` subagent (`.claude/agents/triage.md` — `model: haiku`, tools cut to reading the sweep's item lists; a skill can't switch models, a subagent can). The frontier model sees only what triage flags.
5. **Subscription billing.** The experiment bills to the maintainer's Claude Max (20×) subscription, so no per-run dollar cap applies: the budget is the whole backlog, covered cleanly. Hard stops still exist — rate limits, API failures — and they obey the ledger's rule: stop at a whole item and name every skipped item, linked; the cache makes the next run resume exactly there.
6. **Fresh context per batch.** Batching is a judgment-quality control, not a spend cap (there is none — §5): judgment quality decays long before a window fills, so a sweep never runs as one long conversation — items are processed in batches, each batch in a fresh context, with the cache and the ledger carrying continuity between batches.
7. **Recent windows only, person-first.** Analysis never reads a career history (adamziel alone has thousands of PRs) — recency is both the cost cap and the honesty rule (MAINTAINING.md, rules 1–2). The window is fetched person-first — three searches per member as the baseline, follow-ups allowed and counted when the window needs them, plus one metadata call per distinct repo to classify relatedness — so a full analysis fits GitHub's search quota by design instead of pacing around it; searching the orbit repo-by-repo per member was measured at roughly thirty times the cost for a narrower window.

## Security posture

- **Read-only against upstream.** wordpress-playground is public; the steward reads it through the maintainer's ambient `gh` auth and only ever calls `gh api -X GET` — it never comments, labels, closes, or pushes. **There is no separate token** (a decision of 2026-07-29 — the earlier scope-less-`GH_TOKEN` requirement is removed from scope): read-only rests on the steward issuing GETs only and the guard hook hard-denying every mutating call (see below), not on a scope-limited credential the launcher has to set up. A successful prompt injection can still only mislead a rehearsal file, because the guard denies the call that would act on it. The guard hook is a layer, and for upstream the load-bearing one.
- **Write scope is the steward repo only.** The agent holds no credentials; its writes are ordinary files in the checked-out repo, in gitignored record paths nothing ever commits.
- **Data is never command** — the posture described under "Prompt structure," permanent.
- **Deterministic denial backs the prose.** A committed PreToolUse hook in `.claude/settings.json` hard-denies mutating GitHub calls — including the quiet ones: GraphQL (which posts even for queries), field params that flip `gh api` to POST, request bodies via `--input` — and writes outside the steward's output paths: `messages/`, `reports/`, `maintainers/`, `.claude/state/`. The write allowlist is static and needs no launcher setup (an amendment of 2026-07-29: it was per-workflow, selected by a `STEWARD_WORKFLOW` env var the launcher had to export — friction on every launch that denied nothing the skills' `allowed-tools` didn't already catch; the per-workflow split — the sweep never touching `maintainers/` — now lives in that layer). The data-never-command posture is enforced twice: once as instruction, once as a deny the model cannot talk its way past — and the maintainer's read of `git status` closes the same door at the end of the run: with the record gitignored and only the machinery tracked, any write outside the record paths is visible as a tracked-file change, and nothing persists in git unless the maintainer commits it (amendment of 2026-08-19, replacing the commit-review guarantee — the record is no longer committed at all). Be honest about which layer is load-bearing: the guard path-checks the editing tools' writes, but a shell-level write (`sed -i`, `tee`, a redirect) passes it, and its command patterns are patterns, not proofs. With the scope-less token removed from scope (2026-07-29), upstream read-only rests on the guard plus the steward's GET-only discipline, so the guard is the load-bearing fence for upstream and is reviewed as such, never loosened.
- **Secrets never reach outputs.** A session holds no credential of its own — it borrows the maintainer's ambient `gh` auth for read-only access; no message, report, profile, or ledger line ever contains a secret — the hook's write boundaries and the maintainer's review guarantee it, not the model's discretion.
- **The record never leaves the machine** (an amendment of 2026-08-19, replacing the private-repo-with-collaborators design). Messages contain judgments about named people; `maintainers/` doubly so. Publishing rehearsals would defeat shadow mode. The record paths are gitignored, so the code can be published while the record cannot be pushed by construction. MAINTAINING.md's rule 4 is the content-side guarantee: every file is written to be read by its subject.

## The runtime engine

The engine is deliberately swappable, and the design enforces that: everything the engine needs is committed files (prompts, rulebooks, skills, state), and everything it produces goes through the store. The design once deferred the engine choice; the decisions below close it, and workflow/PLAN.md builds against them.

**Engine: Claude Code, run locally.** The runs are Claude Code sessions the maintainer launches by hand on his own machine — interactively, or through `core/scripts/run.ts`, which starts the same session headless (an amendment of 2026-08-26). A headless run bills the same way, to his **Claude Max (20×) subscription**, and answers no permission prompt, so it runs under `bypassPermissions` with the PreToolUse hook as the fence. Pricing the first full sweep at metered API rates came out around $150, which made hosted metered runs uneconomical for a weekly rehearsal — the subscription absorbs it, and the experiment spends no API budget at all. No per-run dollar cap applies; hard stops (rate limits, API failures) are reported item by item in the ledger.

**Models: Opus for judgment, Haiku for triage** (an amendment of 2026-08-19, replacing Claude Opus 4.8; a same-day Fable 5 pin was reverted before any run — half the price on Opus 5, no cyber-classifier refusal risk on a security-adjacent repo, and per-item judgment is not the long-horizon work Fable is priced for). The judgment passes — rulebook evaluation, staleness, reviewer suggestion, profile writing — run on **Claude Opus 5** (`claude-opus-5`, $5/$25 per million tokens in/out — absorbed by the subscription like everything else). The sweep's cheap first pass runs on **Claude Haiku 4.5** (`claude-haiku-4-5`, $1/$5), switched via the `triage` subagent — its only job is "did this change matter enough for Opus to look?", a classification task, not a judgment.

**The tool allowlist is enumerated, not implied:** read-only `gh` and the skills' scripts everywhere, file writes only inside the steward's output paths, no network beyond the GitHub API — with the skills' own `allowed-tools` and the PreToolUse hook as the layers beneath it.

Replacing the engine — with the Claude Agent SDK (the programmable route to the same agent loop) or another runner — means changing how a session is launched, nothing else; nothing upstream of it depends on the answer.

