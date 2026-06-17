# Agent Project Standards — log-reader

This file defines the conventions, structure, and quality bars every contributor
(including automated Humanize agents) must follow when changing this repository.

## Stack (locked by plan)

- React 18 + TypeScript 5 single-page app, scaffolded with Vite 5.
- Vitest 2.x for unit tests.
- No backend, no SSR, no persistence, no extra UI libraries. Plain CSS only.

## Source tree (locked by plan)

```
src/
  main.tsx              React entry, mounts <App />
  App.tsx               Top-level state + composition
  styles/
    global.css          Layout, typography, scrollbar, responsive
    theme.css           Dark palette + per-log-type CSS variables
  types/
    log.ts              LogType, LogEntry
  constants/
    logTypes.ts         KNOWN_TAGS, LOG_TYPE_ORDER, TAG_LABEL
  lib/
    parser.ts           parseLogLines(text) -> LogEntry[]
    parser.test.ts      Vitest suite
    filter.ts           applyFilters(entries, query, active) -> LogEntry[]
    filter.test.ts      Vitest suite
  components/
    LogInputPanel.tsx
    LogToolbar.tsx
    LogViewer.tsx
    LogLine.tsx
    EmptyState.tsx
```

## Coding rules

1. **TypeScript strict.** `tsconfig.json` runs with `strict: true`,
   `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`.
   New code must compile with `npx tsc --noEmit` clean.
2. **No `any`.** Use `unknown` and narrow; use the `LogType` union for tags.
3. **Pure logic in `src/lib/`.** Parser and filter functions take plain data
   and return plain data — no DOM, no React imports. This is what tests cover.
4. **Stable identifiers.** `LogEntry.index` is the original 1-based line number
   and must never change when filtering or searching.
5. **CSS variables only for colors.** Component CSS reads from `--error`,
   `--bg-error`, etc., declared in `src/styles/theme.css`. Never hard-code hex
   values inside component CSS.
6. **No new dependencies without a plan note.** If a feature seems to require a
   library (e.g., for virtualization), prefer plain CSS + memoization first
   and call it out in the iteration summary instead of silently adding deps.
7. **Accessibility minimum.** Buttons have visible labels, interactive
   elements have focus styles, the textarea has a label association, and
   color is not the only signal (the tag chip carries the textual `[error]`
   label).

## Verification gates

Before claiming an AC complete, run the narrowest meaningful checks:

- `npx tsc --noEmit` — zero errors.
- `npm run build` — exit 0, `dist/` produced.
- `npx vitest run` — all suites pass.
- `npm run dev` — sanity-check the running server (curl `/`) when AC is
  visual.

The Humanize rule "Perform ONLY core tests and compilation/sanity checks"
still applies: do not run exhaustive e2e or visual diff suites inside
implementation iterations.

## Commit cadence

- Bootstrap commits follow the format `chore: <description>`.
- Feature commits use `feat: <ac-id> <short description>`.
- Bug fixes use `fix: <what broke>`.
- Never commit `node_modules/`, `dist/`, or the `.humanize/` working folder.

## Plan awareness

Every implementation iteration must:

1. Read the active AC from the prompt and confirm it matches `.humanize/.../goal-tracker.md`.
2. Implement the smallest slice that satisfies the AC and **only** the AC.
3. Update the goal-tracker `Completed and Verified` section when an AC is done.
4. Leave a concise summary including what changed, what was verified, and
   whether the target AC is now `done`, `pending`, or `blocked`.
