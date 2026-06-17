import { useState } from 'react';
import type { LogEntry } from '../types/log';
import { TAG_LABEL } from '../constants/logTypes';

export interface LogLineProps {
  entry: LogEntry;
}

export function LogLine({ entry }: LogLineProps) {
  const [copied, setCopied] = useState(false);
  const isKnownTag = entry.tag !== 'unknown';
  const lineClassName = isKnownTag
    ? `log-line log-line--${entry.tag}`
    : 'log-line';

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(entry.rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // silently fail
    }
  };

  return (
    <div
      className={`${lineClassName}${copied ? ' log-line--copied' : ''}`}
      data-line-index={entry.index}
      onClick={handleClick}
      title="Click to copy line"
    >
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
      {copied && <span className="log-line__copied-badge">Copied!</span>}
    </div>
  );
}
