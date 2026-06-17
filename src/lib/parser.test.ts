import { describe, it, expect } from 'vitest';
import { parseLogLines } from './parser';
import { KNOWN_TAGS, LOG_TYPE_ORDER } from '../constants/logTypes';
import type { KnownLogType } from '../types/log';

describe('parseLogLines - AC-5 tag detection', () => {
  describe('known tag detection at start of line', () => {
    it.each(LOG_TYPE_ORDER)('detects lowercase [%s] tag', (tag) => {
      const entries = parseLogLines(`[${tag}] something happened`);
      expect(entries).toHaveLength(1);
      expect(entries[0]?.tag).toBe(tag);
      expect(entries[0]?.content).toBe('something happened');
      expect(entries[0]?.rawText).toBe(`[${tag}] something happened`);
    });

    it.each(LOG_TYPE_ORDER)('detects UPPERCASE [%s] tag case-insensitively', (tag) => {
      const upper = tag.toUpperCase();
      const entries = parseLogLines(`[${upper}] something happened`);
      expect(entries).toHaveLength(1);
      expect(entries[0]?.tag).toBe(tag);
      expect(entries[0]?.content).toBe('something happened');
    });

    it.each(LOG_TYPE_ORDER)('detects TitleCase [%s] tag case-insensitively', (tag) => {
      const title = tag.charAt(0).toUpperCase() + tag.slice(1);
      const entries = parseLogLines(`[${title}] something happened`);
      expect(entries).toHaveLength(1);
      expect(entries[0]?.tag).toBe(tag);
      expect(entries[0]?.content).toBe('something happened');
    });

    it.each(LOG_TYPE_ORDER)('detects MiXeD [%s] tag case-insensitively', (tag) => {
      const mixed = tag
        .split('')
        .map((ch, i) => (i % 2 === 0 ? ch.toUpperCase() : ch.toLowerCase()))
        .join('');
      const entries = parseLogLines(`[${mixed}] something happened`);
      expect(entries).toHaveLength(1);
      expect(entries[0]?.tag).toBe(tag);
      expect(entries[0]?.content).toBe('something happened');
    });
  });

  describe('optional leading whitespace', () => {
    it('detects tag after a single leading space', () => {
      const entries = parseLogLines(' [error] oops');
      expect(entries).toHaveLength(1);
      expect(entries[0]?.tag).toBe('error');
      expect(entries[0]?.content).toBe('oops');
      expect(entries[0]?.rawText).toBe(' [error] oops');
    });

    it('detects tag after many leading spaces', () => {
      const entries = parseLogLines('       [warning] watch out');
      expect(entries).toHaveLength(1);
      expect(entries[0]?.tag).toBe('warning');
      expect(entries[0]?.content).toBe('watch out');
      expect(entries[0]?.rawText).toBe('       [warning] watch out');
    });

    it('detects tag after leading tabs', () => {
      const entries = parseLogLines('\t\t[debug] indented');
      expect(entries).toHaveLength(1);
      expect(entries[0]?.tag).toBe('debug');
      expect(entries[0]?.content).toBe('indented');
    });

    it('detects tag after mixed whitespace (spaces + tabs)', () => {
      const entries = parseLogLines(' \t \t[info] hello');
      expect(entries).toHaveLength(1);
      expect(entries[0]?.tag).toBe('info');
      expect(entries[0]?.content).toBe('hello');
    });

    it('preserves leading whitespace in rawText even when tag is detected', () => {
      const entries = parseLogLines('   [success] ok');
      expect(entries[0]?.rawText).toBe('   [success] ok');
    });
  });

  describe('no tag detection', () => {
    it('marks plain text line as unknown tag', () => {
      const entries = parseLogLines('Just some text without any tag');
      expect(entries).toHaveLength(1);
      expect(entries[0]?.tag).toBe('unknown');
      expect(entries[0]?.content).toBe('Just some text without any tag');
      expect(entries[0]?.rawText).toBe('Just some text without any tag');
    });

    it('does NOT detect a tag mid-line', () => {
      const entries = parseLogLines('prefix [error] mid-line tag');
      expect(entries).toHaveLength(1);
      expect(entries[0]?.tag).toBe('unknown');
      expect(entries[0]?.content).toBe('prefix [error] mid-line tag');
      expect(entries[0]?.rawText).toBe('prefix [error] mid-line tag');
    });

    it('does NOT detect a tag preceded only by non-whitespace', () => {
      const entries = parseLogLines('x[error] no-space-prefix');
      expect(entries[0]?.tag).toBe('unknown');
      expect(entries[0]?.content).toBe('x[error] no-space-prefix');
    });

    it('returns empty array for empty input', () => {
      const entries = parseLogLines('');
      expect(entries).toEqual([]);
    });

    it('treats a blank line within input as unknown with empty rawText', () => {
      const entries = parseLogLines('[info] first\n\n[error] third');
      expect(entries).toHaveLength(3);
      expect(entries[0]?.tag).toBe('info');
      expect(entries[1]?.tag).toBe('unknown');
      expect(entries[1]?.rawText).toBe('');
      expect(entries[1]?.content).toBe('');
      expect(entries[2]?.tag).toBe('error');
    });
  });

  describe('unknown tag tokens', () => {
    it('does NOT detect [log] as a known tag', () => {
      const entries = parseLogLines('[log] generic log line');
      expect(entries[0]?.tag).toBe('unknown');
      expect(entries[0]?.content).toBe('[log] generic log line');
    });

    it('does NOT detect [trace] as a known tag', () => {
      const entries = parseLogLines('[trace] stack info');
      expect(entries[0]?.tag).toBe('unknown');
      expect(entries[0]?.content).toBe('[trace] stack info');
    });

    it('does NOT detect [fatal] as a known tag', () => {
      const entries = parseLogLines('[fatal] oh no');
      expect(entries[0]?.tag).toBe('unknown');
      expect(entries[0]?.content).toBe('[fatal] oh no');
    });

    it('does NOT detect [warn] abbreviation as a known tag', () => {
      const entries = parseLogLines('[warn] short form');
      expect(entries[0]?.tag).toBe('unknown');
      expect(entries[0]?.content).toBe('[warn] short form');
    });

    it('does NOT detect [err] abbreviation as a known tag', () => {
      const entries = parseLogLines('[err] short form');
      expect(entries[0]?.tag).toBe('unknown');
      expect(entries[0]?.content).toBe('[err] short form');
    });

    it('does NOT match a malformed bracket like (error)', () => {
      const entries = parseLogLines('(error) wrong bracket type');
      expect(entries[0]?.tag).toBe('unknown');
    });

    it('does NOT match an unclosed bracket like [error', () => {
      const entries = parseLogLines('[error no closing bracket');
      expect(entries[0]?.tag).toBe('unknown');
    });

    it('does NOT match a tag containing digits', () => {
      const entries = parseLogLines('[error1] numbered tag');
      expect(entries[0]?.tag).toBe('unknown');
      expect(entries[0]?.content).toBe('[error1] numbered tag');
    });
  });

  describe('multi-line input and line indexing', () => {
    it('assigns 1-based indices to every line', () => {
      const text = '[info] one\n[error] two\n[debug] three';
      const entries = parseLogLines(text);
      expect(entries.map((e) => e.index)).toEqual([1, 2, 3]);
      expect(entries.map((e) => e.tag)).toEqual(['info', 'error', 'debug']);
    });

    it('handles all six known tags interleaved across lines', () => {
      const text = [
        '[error] e',
        '[warning] w',
        '[info] i',
        '[debug] d',
        '[success] s',
        '[critical] c',
      ].join('\n');
      const entries = parseLogLines(text);
      expect(entries.map((e) => e.tag)).toEqual([
        'error',
        'warning',
        'info',
        'debug',
        'success',
        'critical',
      ]);
    });

    it('preserves original line numbers for unknown lines (no renumbering)', () => {
      const text = '[info] first\nunknown line\n[error] third';
      const entries = parseLogLines(text);
      expect(entries).toHaveLength(3);
      expect(entries.map((e) => e.index)).toEqual([1, 2, 3]);
      expect(entries[1]?.tag).toBe('unknown');
    });

    it('handles trailing newline (empty final entry)', () => {
      const entries = parseLogLines('[info] one\n');
      expect(entries).toHaveLength(2);
      expect(entries[0]?.tag).toBe('info');
      expect(entries[1]?.tag).toBe('unknown');
      expect(entries[1]?.rawText).toBe('');
    });
  });

  describe('CRLF line endings', () => {
    it('strips trailing \\r from CRLF lines and still detects the tag', () => {
      const entries = parseLogLines('[error] oops\r\n[info] next');
      expect(entries).toHaveLength(2);
      expect(entries[0]?.tag).toBe('error');
      expect(entries[0]?.rawText).toBe('[error] oops');
      expect(entries[1]?.tag).toBe('info');
      expect(entries[1]?.rawText).toBe('[info] next');
    });

    it('strips trailing \\r from CRLF lines and still preserves original line numbering', () => {
      const entries = parseLogLines('[error] a\r\n[error] b\r\n[error] c');
      expect(entries.map((e) => e.index)).toEqual([1, 2, 3]);
      expect(entries.map((e) => e.tag)).toEqual(['error', 'error', 'error']);
    });
  });

  describe('content extraction after the tag', () => {
    it('strips only the first following space (not arbitrary whitespace)', () => {
      const entries = parseLogLines('[info]    many spaces');
      expect(entries[0]?.tag).toBe('info');
      expect(entries[0]?.content).toBe('   many spaces');
    });

    it('handles tag with no following space', () => {
      const entries = parseLogLines('[info]immediate');
      expect(entries[0]?.tag).toBe('info');
      expect(entries[0]?.content).toBe('immediate');
    });

    it('handles tag with empty content (just the tag)', () => {
      const entries = parseLogLines('[error]');
      expect(entries[0]?.tag).toBe('error');
      expect(entries[0]?.content).toBe('');
    });
  });

  describe('integration with sample fixture', () => {
    // sample.log is the canonical fixture from the project root. We embed it
    // here so this test has no filesystem or @types/node dependency.
    const SAMPLE_LOG = [
      '[info] Application starting up',
      '[debug] Loaded config from /etc/app/config.yaml',
      '[warning] Deprecated flag --legacy-mode; will be removed in v3.0',
      '[error] Database connection refused: ECONNREFUSED 10.0.0.5:5432',
      '',
      '[info] Retrying in 5 seconds...',
      '[success] Database connection established',
      '[critical] Memory usage above 95%; restarting worker pool',
      '',
    ].join('\n');

    it('parses the sample fixture into correctly tagged entries', () => {
      const entries = parseLogLines(SAMPLE_LOG);
      // sample.log ends with a newline, so the parser yields a trailing
      // empty entry (tag 'unknown') per the parser's documented behavior.
      expect(entries).toHaveLength(9);
      expect(entries.map((e) => e.tag)).toEqual([
        'info',
        'debug',
        'warning',
        'error',
        'unknown', // blank line
        'info',
        'success',
        'critical',
        'unknown', // trailing newline => empty final entry
      ]);
    });
  });

  describe('KNOWN_TAGS invariants', () => {
    it('contains exactly the six documented tags', () => {
      expect([...KNOWN_TAGS].sort()).toEqual(
        (['critical', 'debug', 'error', 'info', 'success', 'warning'] as KnownLogType[]).sort(),
      );
    });

    it('every parsed known tag is a member of KNOWN_TAGS', () => {
      const lines = LOG_TYPE_ORDER.map((t) => `[${t}] sample`).join('\n');
      const entries = parseLogLines(lines);
      for (const entry of entries) {
        expect(KNOWN_TAGS.has(entry.tag as KnownLogType)).toBe(true);
      }
    });
  });
});
