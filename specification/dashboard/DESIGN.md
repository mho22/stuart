# dashboard/DESIGN.md — Design of the Steward's Dashboard

*This document designs the dashboard: the small read-only web UI for browsing what the steward wrote — the messages, the maintainer profiles, the run reports. It is the companion of workflow/DESIGN.md (which designs the machinery that writes those files) and guidelines/DESIGN.md (which designs the rulebooks the machinery judges by); either can change without touching this one, and this one never changes them. This document is authoritative for everything about the dashboard: a rebuild from this file and dashboard/PLAN.md alone must produce the same application — same stack, same data contract, same views, same look — without ever reading the original source.*

## The problem and the goals

The steward's output is hundreds of markdown files in three directories — at last count ~480 would-be messages, nine maintainer profiles, four run reports. Reviewing them through a file browser means opening files one at a time with no filtering, no search, and frontmatter noise on every screen. The sampling protocol (workflow/PLAN.md, Step 6) needs a maintainer to read messages *by kind*; tuning needs him to read them *by person*; neither is practical over raw files.

The dashboard exists to make the shadow-mode record browsable. Three goals, each observable:

1. **Every steward output is readable in one place** — messages filterable by kind and by mentioned maintainer with full-text search, profiles per person, reports per run — each rendered as prose, each linking back to its GitHub item.
2. **Strictly read-only, with no moving parts.** The dashboard never writes a file, never calls a network API, never runs a backend: it inlines the markdown off disk at build time and serves static assets. Nothing it does can touch the steward's data or upstream.
3. **Zero coupling into the machinery.** The steward does not know the dashboard exists. The dashboard reads `core/`'s three output directories and nothing else — not `.claude/`, not the rulebooks, not the specification. If the output format changes, the dashboard chases it, never the reverse.

## Requirements

The acceptance checklist for dashboard/PLAN.md's final step — checked against a running build, not felt:

- [ ] `npm run dev` serves the app with live data; `npm run build` type-checks (strict) and bundles; `npm run preview` serves the bundle. No other command is needed and no environment variable is read.
- [ ] The message count shown in the Messages tab equals `ls core/messages/*.md | wc -l` at build time; likewise maintainers (9) and reports.
- [ ] Filtering by kind, filtering by mentioned maintainer, and full-text search compose — all three narrow the same list — and each chip's count predicts exactly what selecting it would yield under the *other* active filters.
- [ ] A collapsed message card shows kind, item number, workflow, and a two-line body preview; an expanded card shows the full body as rendered markdown plus provenance (copy button, GitHub link, run date, judged-against date).
- [ ] Every outbound link — in rendered markdown, on cards, on profiles — opens in a new tab with `rel="noopener noreferrer"`.
- [ ] The app renders correctly in light and dark (following `prefers-color-scheme`), and at phone width the split views collapse to a single column with a horizontally scrolling selector.
- [ ] The production bundle is fully static: no fetch, no XHR, no runtime file access — the markdown is inlined at build time.

## The shape of the application

A sibling of `core/` at the repository root:

```
stuart/
├── core/                 # the steward — the dashboard reads its three output dirs
│   ├── messages/         #   *.md — one would-be comment each
│   ├── maintainers/      #   *.md — one profile per roster member
│   └── reports/          #   *.md — <date>-<workflow>.md run reports
├── specification/
│   └── dashboard/        # this document + its PLAN.md
└── dashboard/            # this application
    ├── index.html        # <title>Stuart — the contribution steward</title>, mounts #app
    ├── package.json      # name steward-dashboard, private, type module
    ├── vite.config.ts    # vue plugin; server.fs.allow widened to the repo root
    ├── tsconfig.json     # strict, noEmit, bundler resolution
    ├── env.d.ts          # vite/client types + *.vue module shim
    ├── .gitignore        # node_modules, dist, *.local
    ├── README.md         # run instructions + where the data comes from
    └── src/
        ├── main.ts       # createApp(App).mount('#app'), imports styles.css
        ├── data.ts       # the whole data layer (below)
        ├── markdown.ts   # marked wrapper (below)
        ├── styles.css    # the single global stylesheet — all theming lives here
        ├── assets/
        │   └── stuart-logo.png   # the brand mark (see "The one binary")
        └── components/
            ├── MessagesView.vue
            ├── MessageCard.vue
            ├── MaintainersView.vue
            ├── ReportsView.vue
            └── Markdown.vue
```

**Stack, pinned:** Vite 5 + Vue 3.5 (Composition API, `<script setup lang="ts">` everywhere) + TypeScript 5 strict + `marked` 12 for markdown. Dependencies are exactly `vue` and `marked`; dev-dependencies exactly `vite`, `@vitejs/plugin-vue`, `typescript`, `vue-tsc`. Scripts: `dev` → `vite`, `build` → `vue-tsc -b && vite build`, `preview` → `vite preview`. No router (three tabs of local state need none), no store library (the data is a build-time constant), no CSS framework (one hand-written stylesheet), no test framework (the strict type-check and the requirements checklist are the gate — the app has no logic worth a harness that the checklist doesn't already exercise).

**tsconfig, the load-bearing options:** `strict`, `noEmit`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `moduleResolution: "bundler"`, `allowImportingTsExtensions`, `isolatedModules`, `moduleDetection: "force"`, target/lib ES2020 + DOM, `types: ["vite/client"]`, including `src`, `vite.config.ts`, and `env.d.ts`.

**vite.config, one decision:** `server.fs.allow: ['..']` — the dev server's file sandbox is widened to the repo root, because the globbed markdown lives outside the dashboard directory. This is the only Vite configuration beyond the Vue plugin, and it carries a comment saying why. If the steward's output ever moves, this file and `data.ts` are the two places that know. `data.ts` also imports `core/steward.json` and exports `repository`/`repositoryUrl` for the header.

## The data layer

All of it lives in `src/data.ts`; components import its exports and never touch files themselves.

**Loading is `import.meta.glob`, eager, raw.** Three globs — `../../core/messages/*.md`, `../../core/maintainers/*.md`, `../../core/reports/*.md` — each with `{ query: '?raw', import: 'default', eager: true }`. Vite inlines every file's text into the bundle at build time: no runtime fetch, no backend, and the bundle is a self-contained snapshot of the record as of the build. This is goal 2 made structural — a page that cannot request anything cannot leak or mutate anything.

**Frontmatter parsing is deliberately minimal.** The steward writes flat `key: value` pairs between `---` fences (workflow/DESIGN.md, "Message formats") — so the parser is one regex splitting the fences and one regex per line for `key: value`, tolerant of CRLF, returning `{ data, body }` with the body trimmed. A file with no frontmatter parses as all-body. No YAML library: the format is fixed by the steward's own spec, and a real YAML parser would only add failure modes for structure the steward never writes.

**The three record types, and how each field derives:**

- **`Message`** — `id` is the filename stem (e.g. `1019-reminder`); `number` is the leading integer parsed from the stem (issues and PRs share one number space upstream); `kind`, `run`, `item`, `context` come from frontmatter, defaulting to `'unknown'`/`''` when absent (an amendment of 2026-08-20: `workflow` left the record — nothing rendered it — and `context`, the thread comment a message answers, joined it); `judgedAgainst` mirrors the `judged_against` key; `isPr` is derived by testing the `item` URL for `/pull/`; `mentions` is the roster handles found in the body, ordered by first appearance, so `mentions[0]` is the person the message is about (an amendment of 2026-08-20: mention detection moved from the Messages view into the record, because the card renders it too); `body` is the markdown below the fences; `frontmatter` keeps the whole parsed map for anything the UI later wants. Sorted by `number` descending — newest upstream items first.
- **`Maintainer`** — `handle` is the filename stem, `body` the whole file (profiles carry no frontmatter). Sorted by handle, alphabetically.
- **`Report`** — the stem splits as `<yyyy-mm-dd>-<workflow>`; `date` and `workflow` come from that split (a non-matching stem degrades to `workflow = stem`, never a crash). Sorted newest-first, ties broken by workflow name.

Two small shared exports round it out: `kindOrder = ['reminder', 'staleness', 'silence', 'cap', 'concerns', 'reviewer']` — the canonical display order for the six message kinds (`reviewer` added 2026-08-19, with the sweep's review-coverage step) — and a generic `countBy(items, key)` used for every chip count. The `MessageKind` type unions the six literals with `string`: the steward could mint a new kind tomorrow, and the dashboard must render it (with its raw name and no special color) rather than hide it.

## Markdown rendering

`src/markdown.ts` configures `marked` once (`gfm: true`, `breaks: false`) and exports one function: parse to HTML synchronously, then rewrite every `<a ` to add `target="_blank" rel="noopener noreferrer"` — a string replace, applied to all links, because every link in steward output points at GitHub and none should navigate the dashboard away.

`components/Markdown.vue` is the only place `v-html` appears: a `.prose` div rendering that function's output. The `v-html` is safe by provenance, not by sanitizing: everything rendered is steward output written into the local record on the maintainer's own machine (workflow/DESIGN.md, "Anatomy of a run") — the dashboard trusts the working copy it lives in. If the dashboard ever rendered content from anywhere else, sanitization would become a requirement, not an option.

## The shell and the three views

**`App.vue` is the whole chrome:** the entire app sits in one 1080px column, headed by a sticky translucent topbar that stacks two rows. First the brand — the logo at 40px, the title "Stuart — the contribution steward", and the subtitle "Shadow-mode output for <repository> — nothing here was posted upstream." with the repo name — read from `core/steward.json`, the same identity file the skills read, so the header can never disagree with what produced the record — linking to it. Then, on its own line beneath the brand, the tab row: three underline-style tab buttons (Messages, Maintainers, Reports) sharing a hairline bottom border, each showing its collection's count in a pill. The active tab is one `ref`; each tab renders its view component. The subtitle's disclaimer is load-bearing: anyone shown this dashboard must read in the first line that nothing on it was ever posted.

**Messages** is the main view and the only one with filtering. Three controls compose, all narrowing one list:

- **Search** — case-insensitive substring over `number + kind + body`.
- **Kind chips** — "All kinds" plus one chip per canonical kind present in the data, in `kindOrder` order — a kind outside `kindOrder` renders on its cards but never gets a chip. One kind selectable at a time; clicking the active chip clears it.
- **Maintainer chips** — "All maintainers" pinned and carrying no count (it is the one chip without a number), then one chip per roster member *actually mentioned* in at least one message, in a horizontally scrolling row (scrollbar hidden on every engine). A message "mentions" a maintainer when the handle appears in the body — `@adamziel` or bare `adamziel` — matched case-insensitively with lookarounds rejecting word or hyphen characters on either side, so `adamziel` never matches inside `adamziel-fork`.

**Chip counts follow the cross-count rule:** each chip group's counts respect the other filters but *not its own* — the kind counts are computed under the active maintainer filter and search, the maintainer counts under the active kind and search — so a chip always shows exactly what selecting it would yield, and the "All kinds" count is the size of the whole pool under the other filters — the sum over every kind present, chipped or not. A chip whose cross-count hits zero disappears — unless it is the active one, which stays so it can be unselected. Below the toolbar, the card list, with an empty-state line when nothing matches (an amendment of 2026-08-20: the "N messages" result count between them was removed as redundant with the chip counts). An active chip is inverted — text-colored fill, background-colored label — and hovering it dims the label to `--text-faint` instead of the base hover's text color, which on the inverted fill read as black on black (an amendment of 2026-08-20). Chip count pills pull 5px back into the chip's right padding (`margin-right: -5px`) so the pill sits optically centered (an amendment of 2026-08-20).

**A message card** (`MessageCard.vue`) is collapsed by default: a kind badge (label map: reminder → Reminder, staleness → Staleness, silence → Silence, cap → PR cap, concerns → Concerns, reviewer → Reviewer; unknown kinds show raw), "PR #N" or "Issue #N" from `isPr`, the first-mentioned maintainer as a muted tag on `--bg-sunk` (an amendment of 2026-08-20; previously the workflow name, which was `sweep` on nearly every card and said nothing), a chevron pointing right that rotates to point down when open, and a two-line-clamped preview (markdown link syntax collapsed to its label — the preview is plain text, so `[#4264](https://…)` would otherwise show raw (an amendment of 2026-08-20) — whitespace collapsed, first 220 characters, always closed by an ellipsis). While collapsed, the whole card is clickable to expand it and carries a pointer cursor (an amendment of 2026-08-19; previously only the header row toggled); the header row stays a toggle button with `aria-expanded`, and closing goes through it — clicks inside the expanded body never collapse the card, so the copy button and links are safe to use. Expanded, it swaps the preview for the fully rendered body under a hairline top border — headed, when the frontmatter carries a `context` line, by a quoted block naming the thread comment the message answers (an amendment of 2026-08-20; older messages predate the field and render without it) — plus a provenance row above a dashed hairline: a "⧉ copy message" button first (an amendment of 2026-08-19: copies the verbatim body to the clipboard and flashes "✓ copied" for two seconds — the two-click posting path a maintainer uses with the GitHub link beside it; the steward itself still never posts), then "↗ open pull request / issue on GitHub" linking to the item, then "run <date>" and "judged against <date>" (the timestamp's first ten characters — the date, not the time), each shown only when its frontmatter carried a value.

**Maintainers and Reports share one split layout:** a 220px sticky sidebar of selectable entries and a card-styled detail panel. Maintainers list the nine handles with lowercase two-letter avatar disks on `--bg-sunk`; the selected entry highlights on `--accent-soft` in the text color (not the accent) at weight 600. The detail panel heads with a larger accent-tinted avatar, the handle, and a "↗ github.com/<handle>" link, then the profile rendered as markdown. Reports list workflow (label map: Intake, Sweep, Analysis, Audit — raw name for anything new) over the date; the detail panel is just the rendered report. Both default to their first entry selected.

## Visual design

One global stylesheet, `src/styles.css`, holds every rule — components carry no `<style>` blocks, so the whole look is one file, sectioned: theme, layout, toolbar, cards, badges, split views, prose, responsive. The aesthetic is a quiet document-reader: system font stack, 15px base, one accent color, elevation by hairline borders and soft shadows, color reserved for meaning (the kind palette).

**The theme is CSS custom properties on `:root`, redefined wholesale in one `@media (prefers-color-scheme: dark)` block** — no toggle, no stored preference; the OS decides. The tokens are the visual identity and a rebuild copies them exactly:

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#f7f8fa` | `#14161a` |
| `--bg-elev` | `#ffffff` | `#1c1f25` |
| `--bg-sunk` | `#eef1f4` | `#0f1115` |
| `--border` | `#e3e7ec` | `#2a2e35` |
| `--border-strong` | `#d0d6dd` | `#383d46` |
| `--text` | `#1a1d21` | `#e6e9ee` |
| `--text-dim` | `#5b6470` | `#9aa2ad` |
| `--text-faint` | `#949ba5` | `#6d7580` |
| `--accent` | `#2563eb` | `#6ea8ff` |
| `--accent-soft` | `#eaf1fe` | `#16243d` |
| `--shadow` | `0 1px 2px rgba(25,35,55,.05), 0 8px 24px rgba(25,35,55,.07)` | `0 1px 2px rgba(0,0,0,.3), 0 8px 24px rgba(0,0,0,.35)` |

**Each message kind owns a foreground/background pair**, used identically by its badge and echoed in its chip's count:

| Kind | Light fg / bg | Dark fg / bg |
|---|---|---|
| reminder | `#2563eb` / `#e8f0fe` | `#7da7ff` / `#1c2740` |
| staleness | `#b45309` / `#fdf0dc` | `#f0b25f` / `#3a2c14` |
| silence | `#7c6f9c` / `#efecf6` | `#b9abdf` / `#2a2440` |
| cap | `#c2410c` / `#fdeadf` | `#f79457` / `#3a2113` |
| concerns | `#0f766e` / `#dcf3ef` | `#57c9bb` / `#123430` |

**The load-bearing metrics:** one content column, `max-width: 1080px`, holding header and views alike; the topbar sticky with `backdrop-filter: saturate(1.4) blur(12px)` over an 88%-opaque `--bg`, carrying no border of its own — the tab row beneath the brand draws the hairline, and the active tab overlaps it with a 2px `--accent` underline; brand title 22px over a 13.5px subtitle capped at 60ch; tab count pills 12px on `--bg-sunk`, flipping to `--accent`-on-`--accent-soft` when active; base line-height 1.55; chips are full pills (999px radius, 13px text) that invert to `--text`-on-`--bg` when active; the search field focuses with a 3px `--accent-soft` ring; cards are 12px-radius `--bg-elev` panels, gaining `--border-strong` and the shadow when open; badges are uppercase 11.5px with 6px radius; split-view sidebar 220px, sticky at 150px, with a 28px gutter to the detail panel — 14px radius, 26/30px padding, carrying the shadow at rest; item numbers and dates in `tabular-nums`. Rendered markdown gets a dedicated `.prose` scope — 14.5px/1.65, bordered `h2`, `--bg-sunk` code and pre blocks, muted blockquotes and `em`. One breakpoint at 720px collapses the split views to a single column and turns the sidebar into a horizontally scrolling row.

## The one binary

`src/assets/stuart-logo.png` — the square brand mark (~174×174 RGBA), imported in `App.vue` and displayed at 40px — is the single artifact prose cannot carry. A rebuild copies it from any existing checkout; when none exists, any square PNG on transparent background serves, and swapping it later touches one file. Nothing else in the application is binary.

## What the dashboard deliberately is not

- **Not live.** The data is baked at build time; seeing new steward output means rebuilding (in dev, Vite hot-reloads edits to already-globbed files — new files may need a dev-server restart). For a record that changes only when the maintainer commits a run, a snapshot is the honest granularity.
- **Not public.** It renders judgments about named people; it belongs on the maintainer's machine or behind the same privacy as the repo (workflow/DESIGN.md, "Security posture"). Nothing in the build pipeline publishes it.
- **Not a writer.** No button on it edits, retracts, posts, or annotates. Acting on what the record shows — verdicts, tuning — happens through the steward's own loop (workflow/PLAN.md, Step 7), never through the viewer.
