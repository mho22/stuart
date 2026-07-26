# guidelines/PLAN.md — Ordered Build Steps for the Rulebooks

*This is the rulebooks' build plan: the ordered steps that turn guidelines/DESIGN.md into the two prose files the steward loads as config: **CONTRIBUTING.md** (judging issues and PRs; sweep) and **MAINTAINING.md** (profiling the team; analysis). What the rulebooks must contain is specified in the design; this plan only orders the work. It is the companion of workflow/PLAN.md, which builds the machinery and assumes both rulebooks already exist at the repository root — so this plan runs first. Same conventions: each step sized for one working session, a "done when" that can be checked, not felt, and one named risk. The rulebooks are distilled from named sources, never written from scratch; tuning them afterward is the operating loop's job, by editing their prose.*

## Step 0 — Read the design, then the sources

Read guidelines/DESIGN.md in full — its CONTRIBUTING.md and MAINTAINING.md sections fix each rule's number, title, and content, and the numbering is load-bearing: the machinery cites "rules 1–3" (first-sight judgment), "rules 4, 5, 6" (the patrol), and "rule 7" (review coverage), so a different order breaks the machinery's anchors before it is even built.

Then read what the sources table grounds the rules in — distill, never copy, and keep every borrowed idea's link so a reader can verify it:

- [Cognitive Load is What Matters](https://minds.md/zakirullin/cognitive) — the lens behind rules 1 and 8 (working memory, deep vs shallow, familiarity ≠ simplicity).
- Gutenberg's [How to get your PR reviewed](https://github.com/WordPress/gutenberg/blob/trunk/docs/contributors/code/how-to-get-your-pull-request-reviewed.md) — the "one conceptual change" merge rule.
- The [WordPress AI Guidelines](https://make.wordpress.org/ai/handbook/ai-guidelines/) — adopted by reference in rule 3, with disclosure deliberately softened.
- [GitHub on PR limits](https://github.blog/open-source/maintainers/how-pull-request-limits-are-cutting-down-the-noise/) — the cost-to-create vs cost-to-review argument behind rule 4, drafts exempt.
- wordpress-playground's existing PR template — which stays exactly as it is; rule 2 leans on its testing-instructions ask rather than replacing it.

*Risk: writing from memory of the sources rather than the sources — a rule grounded in a page nobody re-read this session inherits errors nobody can trace. If a source is unreachable, say so where the rule cites it and let the sources table's parenthetical distillation stand in — named fallback, never silent.*

*Done when: every row of guidelines/DESIGN.md's sources table maps to a source read (or explicitly noted unreachable) this session.*

## Step 1 — CONTRIBUTING.md

Write the contribution rulebook at the repository root, to the specification in guidelines/DESIGN.md ("CONTRIBUTING.md — the contribution rulebook"): the preamble, the eight rules in the fixed order — each built from the design's content spec plus its grounding, each carrying Binds and Tier — and the closing steward's-own-rules section that workflow/PLAN.md Step 1 will promote to CLAUDE.md as canonical.

The document must obey the rules it preaches: one story per section, the point first, evidence in a few sentences, stop.

*Risk: hardening in prose what the design left soft — a "must" where the decision says nudge quietly rewrites policy under cover of copy-editing; every rule's force comes from the design, not from the writing session's mood.*

*Done when: the eight rules match the design's numbering and titles row for row; every rule carries Binds and Tier; every borrowed claim links its source; the closing section states all seven steward rules, calibration sentence included; and the machinery's anchor citations — rules 1–3, rules 4–6, rule 7 — resolve to rules that actually govern those jobs.*

## Step 2 — MAINTAINING.md

Write the profiling rulebook, to the specification in guidelines/DESIGN.md ("MAINTAINING.md — the profiling rulebook"): seven numbered rules, the pinned ones at their pinned numbers, nothing more.

*Risk: policy leaking toward mechanics — a rule that says how to fetch, window, or diff belongs to the machinery (workflow/PLAN.md's skills); this file says only what may be written about a person, and every mechanical sentence added here is a sentence the analysis run must reconcile with its skill.*

*Done when: seven rules matching the design's numbering and titles (1–2 recency and fade-out, 4 written-to-be-read, 7 the orbit boundary); no rule prescribes mechanics; and every profile property workflow/DESIGN.md's requirements checklist names — facts with links, no verdicts, uncertainty marked — traces to a rule here.*

## Step 3 — The cross-audit

One session reading both files against the design and each other, before the machinery build starts — the same audit the operating loop will repeat monthly:

- Every rule guidelines/DESIGN.md specifies — amendments included — lands in exactly one rule, unchanged in force: nothing hardened, nothing dropped, nothing invented.
- The two files agree where they touch: CONTRIBUTING.md rule 8's symmetry and MAINTAINING.md rule 5's template rule tell one story; the steward's closing rules quote MAINTAINING.md's written-to-be-read standard, not a paraphrase of it.
- The loading posture matches guidelines/DESIGN.md ("How these are used"): each workflow loads only the rulebook that binds it.
- Both files obey the cognitive-load standard they enforce: a reader with two minutes leaves knowing what is asked of them.

*Risk: auditing for eloquence instead of fidelity — the failure mode of a prose system is beautiful text that quietly says something the design never decided.*

*Done when: every check above passes, recorded as a line each in a dated report — `reports/<date>-audit.md`, a record of the build, never a file under `specification/` — after which workflow/PLAN.md Step 0 can run, and the rulebooks are, from that moment, tuned only through the operating loop. The operating loop's monthly re-audit writes its record the same way.*
