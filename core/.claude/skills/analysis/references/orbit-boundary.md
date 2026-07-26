# The orbit boundary — reading rubric

*Read this before interpreting `classify-repo.js` output. It is the *how* behind MAINTAINING.md rule 7 and workflow/DESIGN.md, "Analysis." The boundary is enforced by script before the model sees anything; this rubric governs the two decisions the script leaves to judgment.*

## The signals, and their weight

A repo in the raw window is admitted by its **own evidence**, never by who owns it:

| Signal | Weight | Admits alone? |
|---|---|---|
| Is playground itself, or a fork of it | strong | yes |
| Description/topics name it by a proper name (wordpress-playground, wp-playground, php-wasm) | strong | yes |
| A recent playground item links to it (only if `scan-links.js` ran) | strong | yes |
| Manifest declares playground packages | **weakest** | **no — a lead** |

The bare word "playground" never admits: it names half of GitHub. A manifest declaration alone is what *every repo that merely uses playground* carries — a lead, never an admission.

## The two judgment calls

1. **The manifest-only second look.** When `classify-repo.js` returns `needs_second_look: true`, one repo earned only the manifest signal. Look briefly at its description, topics, and what its recent activity actually touches. Admit **only** if that look corroborates a genuine tie to playground; otherwise drop it, and count the drop. Admissions feed profile claims, so the admit side must be as careful as the drop side (amendment 2026-07-29).

2. **Ambiguity defaults to drop.** When the signals are unclear, drop — privacy-first. A wrongly dropped repo costs a slightly narrower profile; a wrongly admitted one puts off-project activity into a file about a named person. Never research a person off-project, ever.

## What the ledger records

Counts only, never identities of dropped repos: how many repos were classified, how many admitted, how many were manifest-only leads, how many dropped. A dropped repo's items never reach the model and never appear in any output.

## The link signal is only as real as its scan

If `scan-links.js` did not run this session, the link signal is **inactive**: `--linked` is never passed, the orbit record says `link_scan_ran: false`, and no repo is admitted on a link nobody computed. Run the scan, or leave the signal off — never assume it.
