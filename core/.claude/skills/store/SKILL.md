---
name: store
description: Publish, recall, or retract any steward output — the one interface for every message and report the steward writes. Use it whenever you need to write a would-be comment, write a run report, read back what the steward already said about an item, or delete an item's messages. Never for reading upstream (that is the workflow skills' scripts).
allowed-tools: Bash(node .claude/skills/store/scripts/*.js:*), Read(messages/**), Read(reports/**), Read(.claude/state/cache/**), Write(messages/**), Write(reports/**)
---

# store — the steward's output interface

**Job.** Every output the steward produces — a would-be comment, a run report — is a file of the same shape, written, recalled, and retracted by the same four scripts. Workflows never touch `messages/`, `reports/`, or the GitHub comment API directly; they call these scripts. This keeps every rehearsal uniform and keeps the prompts and rulebooks ignorant of how a file gets written.

**Anchors.** Nothing to load from a rulebook — the store holds procedure only, never policy. What to *say* comes from CONTRIBUTING.md / MAINTAINING.md in the calling workflow; the store only writes it down. Assets used (by the scripts, not read into context): `assets/message-frontmatter.md`, `assets/report-template.md`.

**Return.** After a workflow's judgment is made, the corresponding message and report files exist under `messages/` and `reports/`, correctly named and formatted.

## The four operations

Run scripts with Node (the launcher supplies it). Bodies are large markdown — pass them on stdin (heredoc) or `--body-file`, never squeezed onto the command line.

**publish-message** — write/overwrite `messages/<number>-<kind>.md`. `<kind>` ∈ `concerns | reviewer | reminder | cap | staleness | silence`. Always pass `--title` and `--author` with the item's own title and opener, verbatim from the fetched item, and `--summary` with one or two sentences of your own on what the item asks, where it stands, and why it matters — together they let a reader place the message without opening the thread. The summary describes the item, never the message: the message speaks for itself right below it. When the message answers a specific thread comment, pass it as `--context "@author, YYYY-MM-DD: \"a short quote\""` — one line, recorded in the frontmatter so a reader sees what the message responds to. When the body speaks to someone it never names — a cap nudge says "your open PRs" — pass `--to <handle>` so the record still says who it is for.

```bash
node .claude/skills/store/scripts/publish-message.js \
  --item https://github.com/WordPress/wordpress-playground/pull/2905 \
  --title "Add Blueprint step for symlinked plugins" --author contributor \
  --summary "Adds a Blueprint step to mount a symlinked plugin directory. Small, tested, and waiting on its first review since July." \
  --kind reviewer --workflow sweep --run 2026-07-30 \
  --judged-against 2026-07-25T18:40:12Z <<'BODY'
Thanks for this, @contributor — clean single story, Blueprint made it easy to verify.
I'd suggest @bgrgicak as reviewer … If they can't, @brandonpayton is the backup …
BODY
```

**publish-report** — write `reports/<date>-<workflow>.md`, then prune that workflow's reports beyond the three most recent.

```bash
node .claude/skills/store/scripts/publish-report.js \
  --workflow sweep --date 2026-07-30 --body-file /tmp/report.md
```

**recall** — read an item's message files + cache entry (use before re-judging, or before a reviewer suggestion to see whether one already stands).

```bash
node .claude/skills/store/scripts/recall.js --item 2905          # human-readable
node .claude/skills/store/scripts/recall.js --item 2905 --json   # for scripts
```

**retract** — delete an item's message files (and its cache entry, unless `--keep-cache`). Used by the sweep when a target item has closed.

```bash
node .claude/skills/store/scripts/retract.js --item 2905
```

## The message file

Frontmatter records provenance — the item's `title` and `author` so a reader can place the message without opening the thread, and, when given, the `context` line naming the thread comment the message answers and the `to` line naming the person it speaks to; the body below it is the comment **verbatim**, obeying the steward's own rules: one story, the point first, evidence in a few sentences, every reference linked, stop. Silence notes are messages like any other — `kind: silence`, body "I'm staying silent here: I'm not sure whether …".

## Troubleshooting

- **"cannot extract an item number"** — pass a full `/issues/<n>` or `/pull/<n>` URL, or a bare number.
- **A cache entry's messages are gone** — `recall` reports the cache entry with `messages: (none)`; treat the item as needing re-judgment, not as already handled.
- **Report didn't prune** — pruning is per-workflow and only touches `<date>-<workflow>.md` names; a mis-dated filename (not `YYYY-MM-DD-…`) is skipped by design.
