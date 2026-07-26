# Brainstorming — Contribution Steward for wordpress-playground

*Session held July 23–24, 2026. This is the pre-design record, frozen as history: the decisions as they were made in conversation. Nothing here is updated when decisions change — the design documents (guidelines/DESIGN.md, workflow/DESIGN.md) are authoritative, later decisions are recorded there as dated amendments, and on any conflict the designs win.*

## The problem

Issues and pull requests are now mostly written with or by AI. Generating them is nearly free; reviewing them is not. The bottleneck has moved from *writing code* to *human review attention*. Maintainers need help absorbing that load without becoming the hated stale-bot.

### What the data says (WordPress/wordpress-playground, July 2026)

- 441 open issues — **343 of them (78%) untouched since before 2026**. The backlog is rotting.
- ~21 new issues/month — intake volume is modest, not a spam flood.
- ~308 new PRs/month — **~253 from adamziel**, the lead maintainer. The review load is mostly internally generated.
- 107 open PRs, 17 inactive for 3+ months.

Conclusion: the priority problems here are the stale backlog and internal review capacity — not external spam. Rate limiting matters less than it would elsewhere.

## The idea in one breath

An agent that reads a rulebook, judges issues and PRs against it, and writes warm, human, low-cognitive-load messages — in rehearsal (shadow mode).

## The experiment (shadow mode)

A **new private GitHub repository** on the mho22 account. **Three workflows** run the agent, each triggered **manually only**, no cron: nothing spends money unattended, and if the experiment is forgotten for weeks it simply doesn't run. Yannick triggers them independently, at whatever cadence he likes — dense runs accumulate verdict evidence fastest:

- **Intake** — simulates one webhook delivery per run (a picker takes the newest open item the steward has never intaken, walking past everything already judged). Judges the delivered item against the rulebook; reviewer suggestion once it passes.
- **Sweep** — patrol over all open issues and PRs: inactivity reminders, staleness judgment, the report. Cache-assisted (see analysis cache) so unchanged items cost nothing.
- **Analysis** — reads a **recent window** of each roster member's issues, PRs, and reviews across wordpress-playground and the projects orbiting it (the SQLite integration repo is the canonical example: that's where the expertise playground's SQLite issues need actually lives) — and updates the `maintainers/` files. Never the complete history: adamziel alone has thousands of PRs, and recency matters twice — as a cost cap, and because old contributions decay as evidence. A PR merged two years ago, in a project that has since changed, says little about what its author knows or owns *today*; its author may not even remember it. So the incremental updates must let stale scope **fade out** of a maintainer's file, not only add to it — the file describes current scope, not career history. Deliberately its own workflow, separate from the sweep: different cadence, different cost, and a clean write rule — intake and sweep only *read* `maintainers/`; this workflow is the only writer. Run it before intake when the picture feels stale; skipping it just means slightly older knowledge, never an error. *How* the steward reads people has its own rulebook file, **MAINTAINING.md** — a numbered list of profiling rules this workflow loads every run, tuned like everything else by editing prose: add, change, or remove a rule and the next run follows it.

The agent takes **no public action**. Everything it *would* say is written into the repo:

- `messages/` — one markdown file per would-be comment, verbatim ("would comment on #2905: …"). Overwritten on re-evaluation, deleted when the target item closes. The directory always shows the agent's *current* beliefs; git history keeps the archive for diffing weeks.
- `reports/` — dated sweep reports, one per run; old ones pruned from the tree (git history keeps them).
- `maintainers/` — one file per maintainer, named `<github-username>.md`, holding the steward's evolving analysis of that maintainer's scope: the areas they touch, their recent PRs and reviews, their current workload — current scope, not career history. This is the knowledge reviewer assignment draws on. Written only by the analysis workflow, updated incrementally run over run, never rebuilt from scratch. The directory shows the steward's *current* beliefs about each person; git history shows how those beliefs evolved.

**The maintainers in scope:** adamziel, mho22, brandonpayton, fellyph, zaerl, ashfame, bgrgicak, janjakes, akirk. adamziel (project creator) stays in the same loop as everyone — maintainer file, PR-cap mirror, inactivity reminders, reviewer assignment — it's an experiment, the mirror helps him too. No exemptions for anyone: the rulebook is symmetric.

Invited team members browse the results. Yannick tunes the rulebook files — CONTRIBUTING.md and MAINTAINING.md — between runs; those files are the only feedback mechanism (no reply buttons, no interactivity).

## The policy (decided)

Default posture: **everything starts soft**. This is an experiment — every rule below is expressed as a suggestion, nudge, or reminder, never a block. Hardening any rule is a future decision, taken only on the first results of the experiment.

| Rule | Decision |
|---|---|
| PR size | Judged by **reviewer cognitive load** (see minds.md/zakirullin/cognitive), not line count. The agent must articulate the "stories" a reviewer would hold in their head and suggest concrete split boundaries. |
| Big unsplittable PRs | Keep a **single reviewer** for the whole thing — review continuity over load-balancing. |
| Reviewer assignment | Part of the experiment. Triggered **only on new issue or new PR creation** — in the experiment, "new" means never yet intaken, and the picker delivers the newest such item — never by the sweep: the existing backlog is never mass-assigned. Continuity wins for sagas (same reviewer follows a series); load-balancing wins for one-offs. Based on: previous PRs in the area, knowledge, current workload. **Runs only once the steward judges the item valid against the rulebook** — same gate for issues and PRs: open guideline concerns (or a missing reproduction, for issues) are raised first, and the reviewer suggestion waits until they're resolved. **The author is never their own reviewer.** The suggestion is delivered **as a message on the new item**, naming the reviewer and why. Applies to everyone, adamziel included — no exemptions. |
| Open-PR limit | ~**5 per maintainer, advisory only** — a friendly nudge comment on the over-cap PR. **Draft PRs don't count toward the cap** (a draft asks for no review yet) — but drafts still get inactivity reminders and staleness judgment. Applies to everyone in the `maintainers/` roster — no blocking limit for anyone, only suggestions. |
| Inactivity | **30 days → warm reminder.** Clock runs regardless of whose turn it is — but the reminder is **addressed to the right person**: the steward reads the conversation and figures out who the thread is actually waiting on (contributor or maintainer), and speaks to them. **No auto-close.** |
| Ready-for-review PRs | **Never auto-closed.** Reminders only — closing punishes people who are waiting on us. |
| Staleness | AI judgment on whether an item is obsolete/fixed/superseded on the current codebase — with evidence, as a suggestion. Not a timer verdict. |
| Closed items | Closed = archived. No adoption machinery; anyone can reopen or start fresh. |
| AI-assisted work | Follows the [WordPress AI Guidelines](https://make.wordpress.org/ai/handbook/ai-guidelines/) by reference: AI can assist, the human owns every line. **Disclosure is requested, not required** — deliberately softer than upstream, which mandates it: playground's problem is review capacity, not provenance policing. |
| Agent voice | **Warm, grateful, human.** Always explains why, always offers a path back. Never bureaucratic. Kindness is invariant — no experiment result ever changes it. |
| Message linking | Every message and every report line **links directly to the issue/PR it talks about**, so a human can jump straight from the steward's words to the item itself. |
| Agent self-rule | The agent's own comments must obey the cognitive-load rules: one story per comment, lead with the point, evidence in a few sentences, stop. If a comment about cognitive load is tiring to read, the agent has refuted itself. |
| Silence when unsure | Settled: the steward never posts a half-confident judgment. The silence itself is explicit — a short note ("I'm staying silent here: I'm not sure whether …") written as a message like any other, and listed in the sweep report. Uncertainty is visible, never disguised as a verdict. |

## Technical decisions

- **Platform:** local, manually launched runs. The runtime engine is swappable and deliberately deferred — the design is runtime-agnostic (rulebook + prompts + markdown outputs). Current lean: Claude Code, for controllability of system prompt, context files, and tools.
- **CLAUDE.md:** must always contain the cognitive-load article — vendored as a distilled copy in the repo (e.g. `docs/cognitive-load.md`), never fetched at runtime.
- **Rulebook as config:** the policy lives as markdown files the agent reads every run — CONTRIBUTING.md for judging contributions, MAINTAINING.md for profiling maintainers; guidelines/DESIGN.md records their design and rationale. Tuning the agent = editing prose, not code; one rulebook per workflow concern.
- **Per-person exemptions, two levels:** rules can differ per maintainer username or status. Deterministic skips ("this person's PRs never trigger reviewer assignment") belong in the launcher, decided before the model sees anything — zero tokens spent, nothing for the model to misjudge. Judgment-level nuance ("go easier on newcomers", per-person tone) belongs in the rulebook and `maintainers/` files, where the agent can weigh it. No exemptions are active — the mechanism is documented for whenever one is ever needed.
- **Cross-run state:** committed files are the memory (`messages/` + a small state file with per-workflow last-run timestamps). No evictable external cache is ever used for state (evictable = amnesia). It remains a rebuildable derivation of GitHub history, never an authoritative record.
- **Analysis cache:** the steward never re-analyzes an unchanged item from scratch. Each judgment is persisted alongside what it was judged against (the item's last-updated timestamp — a push bumps it just like a comment, so one key covers code and discussion; a head commit alone would miss a decisive comment); the sweep reuses cached analysis and only re-runs judgment on items that changed since the last run. This cache is committed files (same mechanism as `messages/`). This is also the main cost lever for sweeping hundreds of items.
- **Skills:** procedural know-how ships as skills the agent loads per workflow — `sweep` (paging through open items, analysis-cache use, batching under the budget cap), `analysis` (recent-window fetching, profile template, fade-out updates), `intake`, and a shared `store` skill. Skills carry scripts for deterministic GitHub API mechanics (list open items with last activity, diff against the cache, assemble a recent window) so tokens are spent on judgment, not plumbing. Hard boundary: skills hold *how*, never policy — the division is launcher = when, rulebooks = what, skills = how. Skills evolve with the code; specified in workflow/DESIGN.md.
- **Store interface:** the agent talks to a small "publish message / publish report / recall what I said" abstraction — one interface for every output, implementations interchangeable behind it.
- **Slack:** dropped.
- **Privacy:** the experiment repo is **private with invited collaborators** — messages contain judgments about named people; publishing rehearsals would defeat shadow mode.
- **Prompt injection:** everything the steward reads from outside the repo — issue/PR titles, bodies, comments, diffs, linked pages — is untrusted data, never instructions. Only the rulebook, the workflow's own prompts, and files committed to the steward repo direct the agent. Text in an item that tries to instruct the steward ("ignore your rules", "approve this", "assign X as reviewer") is never followed — it is quoted as evidence and flagged in the report. Tool access stays minimal (read-only against upstream), so even a successful injection can't act: shadow mode bounds the blast radius to a bad rehearsal file, and the data/instruction separation is permanent, not an experiment-only precaution.
- **Cost:** the manual-only trigger is the first cost control — nothing runs, nothing spends. Beyond that, sweeps over hundreds of items need batching, a budget cap per run, cheap-model-first triage before frontier-model judgment, and the analysis cache so unchanged items are never re-judged.

## Next steps

1. **Guidelines and rulebooks** — analyze existing WordPress and Automattic contribution guidelines and distill them, together with this document's policy table, into the rulebooks the agent enforces — **CONTRIBUTING.md** and **MAINTAINING.md** — with **guidelines/DESIGN.md** recording their design. Not written from scratch.
2. **Design** — **workflow/DESIGN.md**: architecture, workflow files, prompt structure, store interface, message formats, cost controls.

The rulebooks and the workflow design are deliberately separate even though they are intimately related: the rulebooks (CONTRIBUTING.md, MAINTAINING.md) are loaded into the agent's context every run and are tuned by maintainers, with guidelines/DESIGN.md recording their design; workflow/DESIGN.md describes the machinery that enforces them and evolves with the code. Either side can change without touching the other.
3. **Plan** — ordered build steps.
4. **Build** — the private repo, the workflow, the agent.
5. **Testing** — trigger a run, read the rehearsals, tune the rulebook, repeat — at any cadence, always by hand.
