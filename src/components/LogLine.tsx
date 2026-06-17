import type { LogEntry } from '../types/log';
import { TAG_LABEL } from '../constants/logTypes';

export interface LogLineProps {
  entry: LogEntry;
}

/**
 * Single log row.
 *
 * - AC-3 / AC-8: renders the line index in a fixed-width gutter and the raw
 *   line text.
 * - AC-6: when `entry.tag` is a known log type, the wrapper picks up a
 *   per-tag modifier class (`.log-line--{tag}`) that applies the matching
 *   tinted background, and a colored `.log-tag` chip is rendered with the
 *   canonical `[tag]` label.
 * - AC-7: when `entry.tag === 'unknown'` the chip is omitted and the wrapper
 *   carries no `.log-line--*` modifier, so the line renders as a plain
 *   monospaced row with no background tint — exactly the same look as any
 *   other line minus the highlight.
 *
 * Markup is kept stable across ACs so styling can layer on without
 * restructuring (sticky-gutter + word-break refinements land in AC-13).
 */
export function LogLine({ entry }: LogLineProps) {
  const isKnownTag = entry.tag !== 'unknown';
  const lineClassName = isKnownTag
    ? `log-line log-line--${entry.tag}`
    : 'log-line';

  return (
    <div className={lineClassName} data-line-index={entry.index}>
      <span className="log-line__gutter">{entry.index}</span>
      {isKnownTag ? (
        <span
          className={`log-tag log-tag--${entry.tag}`}
          data-testid="log-tag"
        >
          {TAG_LABEL[entry.tag]}
        </span>
      ) : null}
      <span className="log-line__content">{entry.rawText}</span>
    </div>
  );
}
