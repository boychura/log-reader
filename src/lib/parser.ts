/**
 * Pure parser for log text.
 *
 * - Splits input on `\n` only (never on `\r`); strips a single trailing `\r`
 *   per line to normalize Windows line endings without touching inner
 *   whitespace.
 * - Assigns `index` as the 1-based position in the source array so filtering
 *   and searching can never renumber lines.
 * - Detects a leading `[tag]` (case-insensitive) after optional whitespace
 *   and lowercases the captured token before lookup against `KNOWN_TAGS`.
 *   The matched tag is stripped from `content` along with the optional
 *   single following space; the original line is preserved in `rawText`.
 *
 * The function is total — empty input returns an empty array.
 */
import type { LogEntry, KnownLogType } from '../types/log';
import { KNOWN_TAGS } from '../constants/logTypes';

const TAG_PREFIX = /^\s*\[([a-zA-Z]+)\]\s?/;

export function parseLogLines(text: string): LogEntry[] {
  if (text === '') return [];

  const lines = text.split('\n');
  const entries: LogEntry[] = new Array(lines.length);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    // Normalize trailing `\r` from CRLF without touching other whitespace.
    const rawText = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    const match = rawText.match(TAG_PREFIX);
    let tag: LogEntry['tag'] = 'unknown';
    let content = rawText;
    if (match) {
      const token = match[1]!.toLowerCase();
      if (isKnownTag(token)) {
        tag = token;
        content = rawText.slice(match[0].length);
      }
    }
    entries[i] = { index: i + 1, rawText, tag, content };
  }
  return entries;
}

function isKnownTag(token: string): token is KnownLogType {
  return (KNOWN_TAGS as ReadonlySet<string>).has(token);
}
