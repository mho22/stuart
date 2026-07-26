# The triage rubric

*Read this when handing items to the `triage` subagent (`.claude/agents/triage.md`,
Haiku). Triage is a cheap first pass, not a judgment: its only output is FLAG (Opus
should look) or SKIP (the sweep can pass). The frontier model sees only what triage
flags. Default to FLAG when unsure — a wrongly skipped item is a missed judgment; a
wrongly flagged one costs one Opus look.*

## What reaches triage

`cache-diff.js` sorts open items into four buckets, routed differently:

| Bucket | Route | Triage question |
|---|---|---|
| `unchanged` | served free — reaches no model (staleness exception below) | — |
| `never_judged` | **skips triage by design** — straight to Opus, counted in the ledger | — |
| `changed` | **triage-first**, Opus only if flagged | Did the change matter — a new human comment, new commits, a state change — or only noise (a label edit, a bot action)? |
| `staleness_reverify` | **triage-first**, Opus only if flagged | Did anything land on the default branch that plausibly touches this item? |

Triage's question is always "did a *change* matter enough for Opus?" A never-judged
item has no prior judgment to weigh a change against, so triage is moot — the frontier
must see it once regardless. That is why never-judged bypasses triage; the ledger
counts those items so the accounting stays honest that they reached Opus untriaged.

Default within the two triaged buckets: **FLAG when unsure** — a wrongly skipped item
is a missed judgment; a wrongly flagged one costs one Opus look.

## The noise cases (SKIP)

`updated_at` is broader than "a human spoke." It also bumps on **label changes** and
**bot actions**. A `changed` item whose only news is a label or a bot is still
standing: SKIP it — the sweep refreshes its cache key (`write-cache.js`) and adds no
new word. Nothing here re-arms an inactivity reminder either (CONTRIBUTING.md rule 5).

## The staleness exception to "unchanged = free"

An `unchanged` item can still need Opus if its standing staleness verdict is stale:
its recorded `codebase_position` is behind the current default branch. That is why
`cache-diff.js` re-checks staleness even for unchanged items. Triage asks only
whether the landed changes plausibly touch the item; Opus re-judges only what triage
flags. Everything the codebase question doesn't reach stays free.

## Cheapness is the point, missing a change is not

Triage runs on Haiku precisely so the sweep stays cheap over hundreds of items. But
it never trades correctness for cost: when the signal is ambiguous, FLAG. Being
unsure is a reason to spend one Opus look, not to guess.
