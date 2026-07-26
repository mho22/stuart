# The analysis-cache entry schema

*Read this when writing or reading a cache entry. The cache is local state,
re-derivable from GitHub plus the rulebooks, never authoritative
(workflow/DESIGN.md, "State and the analysis cache").*

One file per judged item: `.claude/state/cache/<number>.json`. Written through
`write-cache.js`, never by hand. Deleted with the item's messages when it closes
(via `store retract`).

## Fields

```json
{
  "number": 2905,
  "item": "https://github.com/WordPress/wordpress-playground/pull/2905",
  "type": "pr",
  "workflow": "sweep",
  "judged_against": "2026-07-25T18:40:12Z",
  "judged_at": "2026-07-30T09:12:00Z",
  "messages": ["2905-concerns.md", "2905-reviewer.md"],
  "verdict": "clean single story; reviewer suggested @bgrgicak / @brandonpayton",
  "staleness": {
    "verdict": "not stale",
    "codebase_position": "trunk@3f2a9c1",
    "judged_at": "2026-07-30T09:12:00Z"
  }
}
```

- **`judged_against`** — the item's `updated_at` at judgment time. The sweep's diff
  against this is why an unchanged item costs nothing. A push bumps `updated_at`
  just like a comment, so one key catches new code and new discussion alike (a head
  SHA would miss a decisive comment).
- **`messages`** — the message files this judgment produced; lets `recall` and the
  housekeeping stay in sync.
- **`staleness`** — present only when a staleness verdict was made. `codebase_position`
  is the default-branch position the verdict was judged against; the sweep re-verifies
  the verdict whenever the branch has moved past it (staleness is a judgment about the
  codebase, not only the item).

## `updated_at` is broader than "a human spoke"

It also bumps on label changes and bot actions. Those are not a human speaking
(CONTRIBUTING.md rule 5): a due item whose only news is a label or a bot is still
standing — refresh its `judged_against` key and add no new word.
