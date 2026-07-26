# The fade-out update procedure

*Read this when writing a profile. It is the *how* behind MAINTAINING.md rules 1–2 (recent evidence only; scope fades unless refreshed). Profiles are updated incrementally, never rebuilt — but they must be allowed to shrink, not only grow.*

## The principle

A profile describes what someone owns **today**. Old scope that no longer shows recent activity must **fade out** of the file, not linger because it was true once. Git history preserves what was removed; the live file is current belief only.

## The procedure, each run

For the member being analyzed, hold two things side by side: the **existing profile** (last run's beliefs) and the **fresh window** (this run's evidence from `search-window.js`, boundary-filtered).

1. **Refresh what recurs.** An area in the existing profile that the fresh window still supports: keep it, update its links to the most recent evidence.

2. **Add what's new.** An area the fresh window shows that the profile lacks: add it, with links. If it rests on a single item, mark it uncertain ("too early to call an area") — rule 6.

3. **Fade what's gone.** An area in the existing profile that the fresh window **no longer supports**:
   - If it has been unsupported for this run only, **soften** it — move it toward the past tense, drop it from "Current areas" into a brief "recently, less active in …" note, trim its links to one.
   - If it was already softened last run and is still unsupported, **remove** it. Two quiet runs is enough; git history keeps it.

4. **Never invent continuity.** Do not carry a claim forward because it "must still be true." If the window doesn't show it, it isn't current evidence — fade it.

## Why two runs, not one

A single thin window can be an artifact — a quiet fortnight, a search that missed a thread (follow-ups exist for exactly this). Fading over two runs guards against deleting a real area on one noisy read, while still keeping the file honest within a couple of runs. When in doubt, soften this run and let the next run decide.

## What never fades

The profile's **shape** never changes — every member keeps the same template (rule 5). Fade-out removes *claims*, never sections; an empty "Current areas" for a genuinely quiet member is an honest profile, not a broken one.
