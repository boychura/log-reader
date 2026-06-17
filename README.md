# Log Reader

A clean, dark-mode, monospaced **log viewer** for `.log` and `.txt` files.
Paste log text or upload a file, and the viewer renders each line as its own
row with line numbers, colored tag chips for `[error]` / `[warning]` /
`[info]` / `[debug]` / `[success]` / `[critical]`, search, filter chips,
copy-visible, and clear.

The whole app is a single-page React + TypeScript build — no backend, no SSR,
no persistence, no analytics.

## Stack

- **React 18** + **TypeScript 5** (strict)
- **Vite 5** dev server / bundler
- **Vitest 2** for unit tests
- Plain CSS with CSS custom properties for theming (no UI framework)

## Project layout

```
log-reader/
├── index.html                 # Vite entry
├── package.json
├── tsconfig.json              # strict TS for src/
├── tsconfig.node.json         # TS for vite.config.ts
├── vite.config.ts             # Vite + Vitest config
├── public/favicon.svg
└── src/
    ├── main.tsx               # React root, mounts <App />
    ├── App.tsx                # Top-level shell (current iteration)
    ├── styles/
    │   ├── theme.css          # Dark palette + per-log-type tokens
    │   └── global.css         # Base layout + responsive rules
    ├── types/                 # (added in AC-5)
    ├── constants/             # (added in AC-5)
    ├── lib/                   # (added in AC-5 onward)
    └── components/            # (added in AC-2 onward)
```

See `.humanize/.../plan.md` for the full feature plan.

## Requirements

- **Node.js ≥ 20.x** (Vite 5 requires ≥ 18; tested on 24).
- **npm ≥ 10**.

## Setup

```bash
npm install
```

## Run in development

```bash
npm run dev
```

Vite serves the app on `http://localhost:5173/` with hot module reload.

## Production build

```bash
npm run build
```

Produces a static `dist/` bundle (HTML + hashed JS + CSS) that can be served
from any static host.

## Preview the production build locally

```bash
npm run preview
```

## Type-check

```bash
npm run typecheck    # npx tsc --noEmit
```

## Tests

```bash
npm test             # npx vitest run
npm run test:watch   # vitest watch mode
```

## What works in AC-1

After this first iteration the project:

- Compiles with **zero TypeScript errors** under `strict: true`.
- Boots with `npm run dev` and serves a placeholder shell on port 5173.
- Builds to `dist/` via `npm run build`.

Subsequent acceptance criteria (AC-2 onward) wire the input panel, parser,
filter, viewer, and toolbar. See `.humanize/.../goal-tracker.md` for the
running list.

## License

Private project scaffold; license is intentionally unspecified until the
upstream project decides.
