import { useEffect, useState, type ChangeEvent } from 'react';
import type { LogType } from '../types/log';
import { FILTER_ORDER, TAG_LABEL } from '../constants/logTypes';
import type { ActiveFilters } from '../lib/filter';

export interface LogToolbarProps {
  /** Current search query (controlled input value). */
  searchQuery: string;
  /** Called when the user types in the search input. */
  onSearchChange: (next: string) => void;
  /** Number of rows currently visible after filtering. */
  visibleCount: number;
  /** Total number of rows loaded (before filtering). */
  totalCount: number;
  /**
   * Which tag chips are currently active. A chip is "active" when its tag
   * is in the set; rows with that tag will then be shown (subject to the
   * search query). The chip group covers exactly the six known tags —
   * unknown rows always pass through and have no chip.
   */
  activeFilters: ActiveFilters;
  /** Per-tag line counts for badge display. */
  tagCounts: Map<LogType, number>;
  /**
   * Called when the user toggles a single chip. The parent is expected
   * to update `activeFilters` (typically via `toggleActiveFilter`).
   */
  onToggleFilter: (tag: LogType) => void;
  /**
   * Called when the user clicks "Clear logs" (AC-11). The parent is
   * expected to wipe the loaded entries AND the textarea so the app
   * returns to its empty state.
   */
  onClear: () => void;
  /**
   * Called when the user clicks "Copy visible logs" (AC-12). The parent
   * is expected to write `visibleCount` post-filter rows to the
   * clipboard and surface a transient confirmation back to this
   * toolbar via `copyStatus` (see below).
   */
  onCopy: () => void;
  /**
   * Transient feedback for the copy button. `'idle'` is the default;
   * `'copied'` flips the button label to "Copied!" for ~1.5 s after a
   * successful copy; `'failed'` shows "Copy failed" if the clipboard
   * write was rejected. Driven by App.tsx.
   */
  copyStatus: 'idle' | 'copied' | 'failed';
  /** When false the toolbar hides itself (no logs loaded yet). */
  enabled: boolean;
}

/**
 * Toolbar row that sits above the log viewer.
 *
 * Exposes:
 *   - the case-insensitive search input (AC-9)
 *   - the six per-tag filter chips (AC-10)
 *   - the "Clear logs" button (AC-11) — wipes both viewer and textarea
 *   - the "Copy visible logs" button (AC-12) — copies the
 *     post-search, post-filter rows to the clipboard, with a
 *     transient "Copied!" / "Copy failed" confirmation
 *
 * Markup:
 * - search icon + `<input type="search">` (UA's native clear "x")
 * - six per-tag toggle buttons, ordered as in `LOG_TYPE_ORDER`
 * - visible/total counter
 * - "Copy visible logs" button + "Clear logs" button, right-aligned
 */
export function LogToolbar({
  searchQuery,
  onSearchChange,
  visibleCount,
  totalCount,
  activeFilters,
  tagCounts,
  onToggleFilter,
  onClear,
  onCopy,
  copyStatus,
  enabled,
}: LogToolbarProps) {
  // Local "mounted-flash" state for the Copy button. The button itself
  // has its visual state driven by the `copyStatus` prop (so the
  // parent decides success/failure), but we use a small local boolean
  // to also pulse the aria-live region while the confirmation is
  // showing. The actual reset is parent-driven when copyStatus flips
  // back to 'idle'.
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (copyStatus === 'idle') {
      setShowFeedback(false);
      return;
    }
    setShowFeedback(true);
    const id = window.setTimeout(() => setShowFeedback(false), 1500);
    return () => window.clearTimeout(id);
  }, [copyStatus]);

  if (!enabled) return null;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  const handleClear = () => {
    onSearchChange('');
  };

  const copyDisabled = visibleCount === 0;
  const copyLabel =
    copyStatus === 'copied' && showFeedback
      ? 'Copied!'
      : copyStatus === 'failed' && showFeedback
      ? 'Copy failed'
      : 'Copy visible logs';
  const copyTitle =
    copyDisabled
      ? 'Nothing to copy (no visible rows)'
      : `Copy ${visibleCount.toLocaleString()} visible line${
          visibleCount === 1 ? '' : 's'
        } to the clipboard`;

  return (
    <div className="log-toolbar" role="search">
      <label className="log-toolbar__search">
        <span className="log-toolbar__search-icon" aria-hidden="true">
          ⌕
        </span>
        <span className="visually-hidden">Search logs</span>
        <input
          type="search"
          className="log-toolbar__search-input"
          value={searchQuery}
          onChange={handleChange}
          placeholder="Search (case-insensitive substring)…"
          aria-label="Search logs (case-insensitive substring)"
          spellCheck={false}
          autoComplete="off"
        />
        {searchQuery !== '' && (
          <button
            type="button"
            className="log-toolbar__search-clear"
            onClick={handleClear}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </label>

      <div
        className="log-toolbar__chips"
        role="group"
        aria-label="Filter by log type"
      >
        {FILTER_ORDER.map((tag) => {
          const active = activeFilters.has(tag);
          const label = TAG_LABEL[tag] || tag;
          const count = tagCounts.get(tag) ?? 0;
          return (
            <button
              key={tag}
              type="button"
              className={`filter-chip filter-chip--${tag}${active ? ' filter-chip--active' : ''}`}
              onClick={() => onToggleFilter(tag)}
              aria-pressed={active}
              data-tag={tag}
              data-active={active ? 'true' : 'false'}
              title={
                active
                  ? `Hide ${label} lines`
                  : `Show ${label} lines`
              }
            >
              {label}
              {count > 0 && (
                <span className="filter-chip__count">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      <span className="log-toolbar__count" aria-live="polite">
        {visibleCount.toLocaleString()} / {totalCount.toLocaleString()} lines
      </span>

      <button
        type="button"
        className={`log-toolbar__copy${
          copyStatus === 'copied' && showFeedback
            ? ' log-toolbar__copy--copied'
            : copyStatus === 'failed' && showFeedback
            ? ' log-toolbar__copy--failed'
            : ''
        }`}
        onClick={onCopy}
        disabled={copyDisabled}
        aria-label={copyTitle}
        title={copyTitle}
        aria-live="polite"
      >
        {copyLabel}
      </button>

      <button
        type="button"
        className="log-toolbar__clear"
        onClick={onClear}
        aria-label="Clear logs (wipes the viewer and the textarea)"
        title="Clear logs"
      >
        Clear logs
      </button>
    </div>
  );
}
