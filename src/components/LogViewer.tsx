import type { LogEntry } from '../types/log';
import { LogLine } from './LogLine';

export interface LogViewerProps {
  entries: LogEntry[];
}

/**
 * Scrollable container that renders one `LogLine` per entry. AC-3 only needs
 * one row per line; the sticky-gutter + monospaced-font + word-break
 * refinements land in AC-13.
 */
export function LogViewer({ entries }: LogViewerProps) {
  if (entries.length === 0) return null;

  return (
    <div className="log-viewer" role="list" aria-label="Log lines">
      {entries.map((entry) => (
        <LogLine key={entry.index} entry={entry} />
      ))}
    </div>
  );
}
