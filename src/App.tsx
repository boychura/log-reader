import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState } from './components/EmptyState';
import { LogInputPanel } from './components/LogInputPanel';
import { LogToolbar } from './components/LogToolbar';
import { LogViewer } from './components/LogViewer';
import { parseLogLines } from './lib/parser';
import { applyFilters, ALL_KNOWN_FILTERS, toggleActiveFilter } from './lib/filter';
import { joinVisibleLines } from './lib/copy';
import type { LogEntry, KnownLogType } from './types/log';

type CopyStatus = 'idle' | 'copied' | 'failed';

export function App() {
  const [isInputPanelOpen, setIsInputPanelOpen] = useState(false);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  // AC-10: six filter chips, all active by default. AC-9's search input
  // is layered on top by applyFilters; chips narrow the visible set by
  // tag without renumbering lines.
  const [activeFilters, setActiveFilters] = useState(() => ALL_KNOWN_FILTERS);
  // AC-11: textarea text is owned here (lifted state) so the Clear
  // button can empty the input panel along with the viewer. The
  // `resetSignal` is bumped on Clear to wipe the input panel's
  // transient filename/error feedback.
  const [inputText, setInputText] = useState('');
  const [inputResetSignal, setInputResetSignal] = useState(0);
  // AC-12: copy button's transient feedback ('idle' / 'copied' / 'failed').
  // Reset back to 'idle' after ~1.5 s so the toolbar returns to its
  // default "Copy visible logs" label.
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const copyResetTimerRef = useRef<number | null>(null);
  const hasLogs = entries.length > 0;

  const handleLoad = (text: string) => {
    setEntries(parseLogLines(text));
  };

  const handleToggleFilter = useCallback((tag: KnownLogType) => {
    setActiveFilters((prev) => toggleActiveFilter(prev, tag));
  }, []);

  // AC-11: "Clear logs" wipes the viewer AND the textarea (the input
  // that produced the current logs). Search query and filter chips are
  // left alone — they're UI state, not log data — so the user does
  // not lose their filter preferences across a clear-and-reload.
  const handleClearLogs = useCallback(() => {
    setEntries([]);
    setInputText('');
    setInputResetSignal((n) => n + 1);
  }, []);

  // AC-9 search + AC-10 tag filter are composed in applyFilters: every
  // row must pass BOTH predicates (unknown rows still pass the tag check
  // because there's no chip for them — see src/lib/filter.ts contract).
  // Memoized so the toolbar and viewer agree without re-filtering on
  // unrelated re-renders.
  const visibleEntries = useMemo(
    () => applyFilters(entries, searchQuery, activeFilters),
    [entries, searchQuery, activeFilters],
  );


  // AC-12: "Copy visible logs". Sends the post-search, post-filter
  // rows (joined by '\n', original text preserved — see
  // src/lib/copy.ts) to the clipboard via navigator.clipboard.writeText.
  // Falls back to the legacy `document.execCommand('copy')` path on a
  // hidden textarea when the modern API is unavailable (e.g. insecure
  // HTTP context, very old browsers). Any failure path flips
  // copyStatus to 'failed' so the toolbar can show "Copy failed".
  const handleCopyVisible = useCallback(async () => {
    const text = joinVisibleLines(visibleEntries);
    if (text.length === 0) {
      // Nothing to copy; treat as failed so the toolbar reflects it.
      setCopyStatus('failed');
      return;
    }
    const writeViaClipboardApi = async (): Promise<boolean> => {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function'
      ) {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    };
    const writeViaExecCommand = (): boolean => {
      if (typeof document === 'undefined') return false;
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.left = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      document.body.removeChild(ta);
      return ok;
    };
    let success = await writeViaClipboardApi();
    if (!success) success = writeViaExecCommand();
    setCopyStatus(success ? 'copied' : 'failed');
  }, [visibleEntries]);

  // Reset the copy button's transient state after ~1.5 s so the label
  // returns to "Copy visible logs". Cancelled on unmount and on
  // re-trigger (the next copy restarts the timer).
  useEffect(() => {
    if (copyStatus === 'idle') return;
    if (copyResetTimerRef.current !== null) {
      window.clearTimeout(copyResetTimerRef.current);
    }
    copyResetTimerRef.current = window.setTimeout(() => {
      setCopyStatus('idle');
      copyResetTimerRef.current = null;
    }, 1500);
    return () => {
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
        copyResetTimerRef.current = null;
      }
    };
  }, [copyStatus]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">Log Reader</h1>
        <p className="app-subtitle">
          Paste or upload <code>.log</code> / <code>.txt</code> files and view
          them with tag highlighting, search, and filters.
        </p>
      </header>

      <section
        className="input-panel"
        data-open={isInputPanelOpen ? 'true' : 'false'}
        aria-label="Log input"
      >
        <button
          type="button"
          className="input-panel__toggle"
          aria-expanded={isInputPanelOpen}
          aria-controls="input-panel-body"
          onClick={() => setIsInputPanelOpen((open) => !open)}
        >
          <span className="input-panel__chevron" aria-hidden="true">
            {isInputPanelOpen ? '▾' : '▸'}
          </span>
          <span className="input-panel__toggle-label">Input</span>
          <span className="input-panel__toggle-hint">
            {isInputPanelOpen ? 'Click to collapse' : 'Click to expand'}
          </span>
        </button>
        {isInputPanelOpen && (
          <div id="input-panel-body" className="input-panel__body">
            <LogInputPanel
              text={inputText}
              onTextChange={setInputText}
              resetSignal={inputResetSignal}
              onLoad={handleLoad}
            />
          </div>
        )}
      </section>

      <main className="viewer-area" aria-label="Log viewer">
        {hasLogs ? (
          <>
            <LogToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              visibleCount={visibleEntries.length}
              totalCount={entries.length}
              activeFilters={activeFilters}
              onToggleFilter={handleToggleFilter}
              onClear={handleClearLogs}
              onCopy={handleCopyVisible}
              copyStatus={copyStatus}
              enabled={hasLogs}
            />
            <LogViewer entries={visibleEntries} />
          </>
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}
