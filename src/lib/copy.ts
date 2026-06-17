/**
 * Pure helpers for the AC-12 "Copy visible logs" feature.
 *
 * The copy button ships the post-search, post-filter rows to the clipboard
 * joined by `\n`. Each row's text is the entry's ORIGINAL `rawText` (not
 * the stripped `content`) — that preserves the leading `[tag]` prefix and
 * any inner whitespace exactly as the user loaded it. The plan is explicit
 * about this: "Copy visible logs" copies "the currently rendered
 * (post-search, post-filter) lines — preserving their original text".
 */
import type { LogEntry } from '../types/log';

/**
 * Concatenate a list of entries into the single string the clipboard
 * receives. Lines are joined with `\n` (no trailing newline — `join`
 * never emits one, and the spec says "joined by `\n`"). An empty input
 * returns an empty string.
 *
 * Pure: deterministic, no I/O.
 */
export function joinVisibleLines(entries: readonly LogEntry[]): string {
  return entries.map((e) => e.rawText).join('\n');
}
