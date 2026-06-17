/**
 * Pure filtering for parsed log entries.
 *
 * Used by the search input (AC-9) and filter chips (AC-10). The two are
 * composed by `applyFilters`: a row must pass BOTH the tag-active check and
 * the search-substring check. Order does not matter — these are conjunctive
 * predicates on the same input.
 *
 * The function is total — empty inputs return the entries unchanged.
 *
 * Contract:
 * - Pure: no DOM, no I/O, deterministic.
 * - Stable: preserves `entry.index` for every kept row, so the rendered
 *   line numbers never shift when filters narrow the visible set.
 * - Case-insensitive: `query` is trimmed and lowercased; matches against
 *   `entry.rawText` (lowercased). Whitespace inside a line is preserved.
 * - Tag set: rows whose `tag === 'unknown'` are ALWAYS passed through the
 *   tag check, regardless of what `active` contains. AC-10 only ships six
 *   filter chips (error/warning/info/debug/success/critical) — there is
 *   no chip for `unknown` — so its rows must remain visible by default.
 *   This preserves AC-3 (every pasted line appears) and AC-7 (unknown
 *   lines render as plain log lines). When the user deactivates ALL
 *   six chips the unknown rows still pass through (consistent with the
 *   "no chip = no filter" rule for unknown rows); callers who want to
 *   hide everything must filter `[]` upstream.
 */
import type { LogEntry, LogType, KnownLogType } from '../types/log';
import { KNOWN_TAGS, LOG_TYPE_ORDER } from '../constants/logTypes';

export type ActiveFilters = ReadonlySet<LogType>;

/**
 * A filter set that lets every known log type through. Convenience export
 * for callers (AC-9 default, AC-10 reset, etc.).
 */
export const ALL_KNOWN_FILTERS: ActiveFilters = new Set<LogType>(
  LOG_TYPE_ORDER as readonly KnownLogType[],
);

/** Build an ActiveFilters set from a list of tags; unknown tags are ignored. */
export function makeActiveFilters(tags: readonly LogType[]): ActiveFilters {
  const next = new Set<LogType>();
  for (const tag of tags) {
    if (KNOWN_TAGS.has(tag as KnownLogType)) {
      next.add(tag);
    }
  }
  return next;
}

/**
 * Return a NEW `ActiveFilters` set with `tag`'s membership flipped.
 *
 * - `tag` must be a known log type (`KNOWN_TAGS` member). `'unknown'`
 *   is intentionally NOT accepted: unknown rows are always visible
 *   (no chip in the AC-10 UI), so toggling them would be a no-op and
 *   the function rejects it loudly to surface call-site bugs.
 * - If the result would be an empty set, that set is returned as-is.
 *   The caller (App.tsx) decides whether to disallow an empty set at
 *   the UI level — `applyFilters` itself handles an empty set fine:
 *   known rows drop out, unknown rows still pass (see contract above).
 */
export function toggleActiveFilter(
  active: ActiveFilters,
  tag: KnownLogType,
): ActiveFilters {
  if (!KNOWN_TAGS.has(tag)) {
    throw new Error(
      `toggleActiveFilter: '${tag}' is not a known log type (refusing to toggle)`,
    );
  }
  const next = new Set<LogType>(active);
  if (next.has(tag)) {
    next.delete(tag);
  } else {
    next.add(tag);
  }
  return next;
}

/**
 * Return a new array containing only entries that:
 *  1. have a tag included in `active`, OR have `tag === 'unknown'`
 *     (unknown rows always pass — see contract above), AND
 *  2. contain `query` (case-insensitive substring) in `entry.rawText` when
 *     `query` is non-empty.
 *
 * An empty/whitespace-only query short-circuits the substring check (every
 * row passes the search test); the tag check still applies. An empty
 * `active` set does NOT short-circuit: rows whose tag is in the empty set
 * are filtered out, but unknown-tagged rows still pass through.
 *
 * Original line numbers (`entry.index`) are preserved for every kept row —
 * no renumbering.
 */
export function applyFilters(
  entries: readonly LogEntry[],
  query: string,
  active: ActiveFilters,
): LogEntry[] {
  const q = query.trim().toLowerCase();
  if (entries.length === 0) return [];
  const matchesTag = (e: LogEntry): boolean =>
    e.tag === 'unknown' || active.has(e.tag);
  if (q === '') {
    // No search predicate; pure tag filter (unknown rows always pass).
    return entries.filter(matchesTag);
  }
  return entries.filter((e) => {
    if (!matchesTag(e)) return false;
    return e.rawText.toLowerCase().includes(q);
  });
}
