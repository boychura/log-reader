/**
 * Locked-in type contracts (see plan "Type contracts" section).
 * Downstream ACs (AC-5 tag detection, AC-6/AC-7 chip rendering,
 * AC-8 line gutter, AC-9 search) all consume these types directly.
 */

export type LogType =
  | 'error'
  | 'warning'
  | 'info'
  | 'debug'
  | 'success'
  | 'critical'
  | 'unknown';

export interface LogEntry {
  /** 1-based original line number — never renumbered by filter/search. */
  index: number;
  /** Exact original line content; never trimmed beyond trailing `\r`. */
  rawText: string;
  /** Tag detected at start of line (after optional leading whitespace),
   *  else `'unknown'`. */
  tag: LogType;
  /** `rawText` with the leading `[tag] ` prefix removed when `tag` is
   *  known; otherwise equal to `rawText`. */
  content: string;
}

/** Subset of `LogType` excluding the `'unknown'` sentinel. */
export type KnownLogType = Exclude<LogType, 'unknown'>;
