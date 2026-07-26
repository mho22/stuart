# dashboard/PLAN.md — Ordered Build Steps for the Dashboard

*This is the dashboard's build plan: the ordered steps that turn dashboard/DESIGN.md into the running viewer. Each step is sized for one working session, ends with a "done when" that can be checked, not felt, and names its one risk. The plan assumes the steward already exists and has run — `core/messages/`, `core/maintainers/`, and `core/reports/` are populated (workflow/PLAN.md built them; its calibration runs filled them) — because a viewer built against empty directories proves nothing. Every decision this plan builds against — stack, data contract, view behavior, theme tokens — is closed in dashboard/DESIGN.md; where this plan and that document disagree, the design wins.*

## Step 0 — Scaffold

Create `dashboard/` beside `core/` and lay down the shell exactly as dashboard/DESIGN.md fixes it ("The shape of the application"):

- `package.json` — name `steward-dashboard`, private, `"type": "module"`; dependencies `vue` + `marked`, dev-dependencies `vite` + `@vitejs/plugin-vue` + `typescript` + `vue-tsc`, and nothing else; scripts `dev`/`build`/`preview` as the design states them.
- `tsconfig.json` with the design's load-bearing options (strict, noEmit, bundler resolution, the unused-code checks), `vite.config.ts` with the Vue plugin and `server.fs.allow: ['..']` under a comment saying why, `env.d.ts` with the vite/client reference and the `*.vue` module shim, `.gitignore` (node_modules, dist, `*.local`).
- `index.html` titled "Stuart — the contribution steward", mounting `#app`; `src/main.ts` creating the app and importing `styles.css`; a placeholder `App.vue`; the logo copied into `src/assets/stuart-logo.png` (or a stand-in square PNG — dashboard/DESIGN.md, "The one binary").

*Risk: dependency drift — a scaffolding tool's template quietly adds a router, a linter config, or a test runner the design deliberately excludes; the file list above is exhaustive, and anything a generator adds beyond it comes out.*

*Done when: `npm install` then `npm run build` completes with the placeholder app — the toolchain proves itself before any real code exists.*

## Step 1 — The data layer

`src/data.ts` and `src/markdown.ts`, exactly to the design's contract ("The data layer", "Markdown rendering"): the three eager raw globs into `core/`, the two-regex frontmatter parser, the `Message`/`Maintainer`/`Report` derivations with their default values and sort orders, `kindOrder`, `countBy`, and the marked wrapper with the new-tab link rewrite.

This step is where the data contract is honest or isn't — every later view only arranges what these two files produce.

*Risk: over-parsing — reaching for a YAML library or "fixing" odd frontmatter in the viewer; the parser stays minimal on purpose, and a malformed steward file should degrade (all-body, `unknown` kind), never crash the build.*

*Done when: a temporary render of the raw arrays shows every count matching the directories on disk (`ls core/messages/*.md | wc -l`, 9 maintainers, one report per file), messages sorted by number descending, a spot-checked message carrying the right kind, workflow, item URL, `isPr`, and body with no fence residue.*

## Step 2 — The shell

`App.vue` for real: the single 1080px column wrapping everything, the sticky translucent topbar stacking its two rows — the brand block (logo at 40px, title, the shadow-mode disclaimer subtitle linking to WordPress/wordpress-playground), then the underline-style tab row on its own line beneath it, three count-badged tabs switching a single `ref` — plus the foundation sections of `styles.css`: the two `:root` token blocks copied exactly from the design's tables (theme and kind palette, light and dark), base typography, layout, topbar, and tab rules.

*Risk: token drift — a "close enough" hex or an improvised extra color; the tables in dashboard/DESIGN.md ("Visual design") are the identity, copied verbatim, and any new color the build seems to need is a design question, not a CSS edit.*

*Done when: the shell renders with correct counts in all three tabs, switching works, and flipping the OS appearance flips the whole page between the light and dark tables with no unstyled flash.*

## Step 3 — Messages

The main view, in two components:

- `MessageCard.vue` — collapsed: kind badge, PR/Issue #N, workflow tag, chevron, the 220-character two-line preview; expanded via the header button (`aria-expanded`): the markdown body through `Markdown.vue`, then the provenance row (GitHub link, run date, judged-against date truncated to ten characters — the dates only when their frontmatter carried a value).
- `MessagesView.vue` — search over number + kind + body; the kind chip row in `kindOrder`; the pinned-plus-scrolling maintainer chip row with the design's mention regex; the cross-count rule computed exactly as stated ("each group's counts respect the other filters but not its own"), zero-count chips hidden unless active; the result count and the empty state.

The card styles, chip styles, and badge palette land in `styles.css` alongside.

*Risk: the cross-count rule half-implemented — counts computed against the fully filtered list look right until a filter is active, then chips stop predicting what clicking them yields; the "done when" below tests it with filters on, not off.*

*Done when: with a kind selected, each maintainer chip's count equals the messages of that kind mentioning that maintainer (hand-checked for one pair); with a maintainer selected, the kind counts mirror it; search narrows both; clicking an active chip clears it; a kind absent from the data — or outside the canonical five — shows no chip; the pinned "All maintainers" chip carries no count; and an expanded card's GitHub link opens the right item in a new tab.*

## Step 4 — Maintainers and Reports

The two split views on the shared layout (`view--split`, the 220px sticky sidebar, the detail card): `MaintainersView.vue` with lowercase avatar-disk entries and the profile panel headed by handle and `↗ github.com/<handle>` link; `ReportsView.vue` with workflow-over-date entries (label map including Audit) and the rendered report. Both default to their first entry. The split-view, avatar, profile, and prose sections of `styles.css` land here, including the 720px collapse.

*Risk: the prose styles tuned on one lucky file — profiles and reports use more markdown surface than messages (tables of links, nested lists, long headings); check the widest real file, not the prettiest.*

*Done when: all nine profiles and every report render cleanly in both themes, every link inside them opens in a new tab, and at phone width both views collapse to a single column with the sidebar scrolling horizontally.*

## Step 5 — Verification and the README

The closing pass, against dashboard/DESIGN.md's requirements checklist as a whole:

- Walk every checklist line against the running dev build and the production build (`npm run build` then `npm run preview`) — counts against disk, filter composition, card anatomy, new-tab links, both themes, the 720px collapse.
- Confirm the bundle is static: the network panel shows assets only — no fetch, no XHR — on load and through every interaction.
- Write `README.md`: what the dashboard is (read-only viewer over the steward's shadow output), how to run it (the three npm scripts), what each tab shows, and how it finds the data — naming `data.ts`'s globs and `vite.config.ts`'s `fs.allow` as the two places to update if the output ever moves. Counts quoted in it are of-the-moment, not promises.

*Risk: verifying against the dev server only — `import.meta.glob` and `fs.allow` behave differently in dev and build, and only `preview` proves the inlined bundle stands alone.*

*Done when: every requirement in dashboard/DESIGN.md's checklist passes on the production build, and a colleague with only this repo and the README gets from clone to browsing in the three commands it names.*
