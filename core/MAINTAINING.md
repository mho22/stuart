# MAINTAINING.md — How the Steward Reads People

*The profiling rulebook. The analysis workflow loads this file every run; it is the single writer of the `maintainers/` files. This is the most sensitive thing the steward does — writing about named people — so it binds hardest by staying shortest. Tuning the steward means editing this prose, never code.*

*These rules say only **what may be written about a person**. How to fetch, window, or diff belongs to the machinery (the analysis skill). Every mechanical sentence added here is a sentence the analysis run would have to reconcile with its skill — so none is added.*

Seven rules:

## 1. Recent evidence only

Read a recent window of a person's activity, never a career history. Old contributions decay as evidence: a PR merged two years ago, in a project that has since changed, says little about what its author knows or owns today — its author may not even remember it. Recency is both an honesty rule and a cost cap.

## 2. Scope fades unless refreshed

A profile describes what someone owns *today*, not what they once did. Update incrementally, run over run: new evidence enters, and areas no longer showing recent activity **fade out** of the file. The file is never rebuilt from scratch — git history shows how the picture evolved — but it must be allowed to shrink, not only grow.

## 3. Facts with links, never verdicts

Write areas touched, recent activity, and current workload — each claim carrying the link that grounds it. No rankings, no competence grades, no "strong" or "weak." A reader should be able to click every claim and see the evidence for themselves.

## 4. Written to be read by its subject

If a line would be uncomfortable to show the person it describes, it does not belong in the file. This is the content-side guarantee of a private repo: the profile is a fair, linkable record its subject could read without surprise.

## 5. Same template for everyone

Every profile has the same shape — the project creator's file looks like the newest member's. Symmetry is the rule; no one is profiled more gently or more harshly than anyone else.

## 6. Unsure is said out loud

An uncertain scope claim is marked as uncertainty, never asserted as fact. "Appears to be picking up the OPFS work (one recent PR — too early to call an area)" is honest; stating it flatly is not.

## 7. The orbit is the boundary

The window is a person's recent activity, read person-first — wherever around playground they were active. But only two kinds of repository are kept: **playground itself**, and repos whose **own evidence** ties them to it — a fork of playground, a manifest declaring playground packages, a description or topics naming playground by a proper name (wordpress-playground, wp-playground, php-wasm — the bare word "playground" names half of GitHub and never admits), or a link from recent playground work (the SQLite integration repo is the canonical example).

A declared dependency alone is the **weakest** signal and never admits by itself: any repo that merely *uses* playground carries one, so a dependency-only candidate earns admission only when a brief look at the repo corroborates a genuine tie. Ownership is never the test — a personal repo can be deeply related, an org repo can be noise. Everything unrelated is dropped **unread**. No off-project research about a person, ever.

---

*Grounding: the brainstorm's analysis-workflow decisions (recent window, fade-out, single-writer rule) and the experiment's privacy posture; the person-first window and relatedness-filtered orbit (amendment 2026-07-28); a dependency declaration never admitting alone without a corroborating second look (amendment 2026-07-29). Recorded in `specification/guidelines/DESIGN.md`.*
