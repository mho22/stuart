# Stuart — the steward's dashboard

A small read-only web UI for browsing what the steward wrote: the would-be
messages, the maintainer profiles, and the run reports under `core/`. It is
shadow-mode output only — nothing shown here was ever posted upstream — and
the dashboard keeps it that way structurally: it never writes a file, never
calls a network API, never runs a backend. The markdown is inlined off disk
at build time and served as static assets.

## Running it

```sh
npm install
npm run dev       # serves the app with live data at the printed URL
npm run build     # type-checks (strict) and bundles into dist/
npm run preview   # serves the production bundle
```

No other command is needed and no environment variable is read.

## The three tabs

- **Messages** — every would-be comment, one card per file, newest upstream
  item first. Filter by kind, by mentioned maintainer, and by full-text
  search; all three compose, and each chip's count predicts exactly what
  selecting it would yield under the other active filters. A collapsed card
  shows kind, item number, workflow, and a two-line preview; expanded, the
  full rendered body plus provenance — the GitHub link, the run date, and
  the judged-against date.
- **Maintainers** — one profile per roster member, with a link to their
  GitHub account.
- **Reports** — one entry per run report, newest first, labeled by workflow
  (Intake, Sweep, Analysis, Audit) over its date.

At the time of writing the record holds 482 messages, 9 maintainers, and
4 reports; the counts in the tab bar are whatever is on disk at build time.

## Where the data comes from

`src/data.ts` eagerly globs three directories as raw text —
`../../core/messages/*.md`, `../../core/maintainers/*.md`, and
`../../core/reports/*.md` — so Vite inlines every file into the bundle.
`vite.config.ts` widens the dev server's file sandbox (`server.fs.allow:
['..']`) to the repo root, because that markdown lives outside the dashboard
directory. If the steward's output ever moves, those two files are the two
places to update. Seeing new steward output means rebuilding (in dev, Vite
hot-reloads edits to already-globbed files — brand-new files may need a
dev-server restart).
