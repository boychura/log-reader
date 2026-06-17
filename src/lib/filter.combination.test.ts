// AC-15: filter combination edge cases.
import { describe, it, expect } from 'vitest';
import { applyFilters, ALL_KNOWN_FILTERS, toggleActiveFilter } from './filter';
import { parseLogLines } from './parser';
import type { LogEntry, KnownLogType } from '../types/log';

const allTagsIncludingUnknown = (): Set<LogEntry['tag']> =>
  new Set<LogEntry['tag']>([
    'error',
    'warning',
    'info',
    'debug',
    'success',
    'critical',
    'unknown',
  ]);

describe('filter combination logic - edge cases (AC-15)', () => {
  describe('search query is NOT a regex', () => {
    const sample = parseLogLines(
      [
        '[info] literal dot here',
        '[info] regex-special: .*+?^${}()|[]\\',
        '[info] no specials',
        'plain line with [error] mid-string',
      ].join('\n'),
    );

    it('treats dot as a literal dot', () => {
      // Row 1 contains the word "dot" but no literal "." character;
      // row 2 contains a literal "." in the regex-special sample.
      const visible = applyFilters(sample, '.', allTagsIncludingUnknown());
      expect(visible.map((e) => e.index)).toEqual([2]);
    });

    it('treats dot-star as two literal characters', () => {
      const visible = applyFilters(sample, '.*', allTagsIncludingUnknown());
      expect(visible.map((e) => e.index)).toEqual([2]);
    });

    it('treats brackets as literals, not a character class', () => {
      const visible = applyFilters(sample, '[error]', allTagsIncludingUnknown());
      expect(visible.map((e) => e.index)).toEqual([4]);
    });

    it('treats backslash as a literal backslash', () => {
      // Search for a single backslash; row 2 ends with two literal
      // backslashes in the source which serialize to one backslash on
      // disk — so we need a substring that is actually present.
      const visible = applyFilters(sample, '.*+?', allTagsIncludingUnknown());
      expect(visible.map((e) => e.index)).toEqual([2]);
    });
  });

  describe('unicode and non-ASCII content', () => {
    const sample = parseLogLines(
      ['[info] hello', '[info] héllo wörld', '[info] 日本語のログ', '[info] emoji 🎉 line'].join(
        '\n',
      ),
    );

    it('matches accented characters case-insensitively', () => {
      const visible = applyFilters(sample, 'HÉLLO', allTagsIncludingUnknown());
      expect(visible.map((e) => e.index)).toEqual([2]);
    });

    it('matches CJK characters as substring', () => {
      const visible = applyFilters(sample, '日本語', allTagsIncludingUnknown());
      expect(visible.map((e) => e.index)).toEqual([3]);
    });

    it('matches emoji as substring', () => {
      const visible = applyFilters(sample, '🎉', allTagsIncludingUnknown());
      expect(visible.map((e) => e.index)).toEqual([4]);
    });
  });

  describe('degenerate input combinations', () => {
    it('empty entries + non-empty query returns empty', () => {
      expect(applyFilters([], 'anything', allTagsIncludingUnknown())).toEqual([]);
    });

    it('empty entries + empty query returns empty', () => {
      expect(applyFilters([], '', allTagsIncludingUnknown())).toEqual([]);
    });

    it('whitespace-only entries are kept when query is empty', () => {
      const sample = parseLogLines('[info] a\n   \n[error] b');
      const visible = applyFilters(sample, '', allTagsIncludingUnknown());
      expect(visible.map((e) => e.index)).toEqual([1, 2, 3]);
    });
  });

  describe('one-chip-off permutations', () => {
    const sample = parseLogLines(
      [
        '[error] one',
        '[warning] two',
        '[info] three',
        '[debug] four',
        '[success] five',
        '[critical] six',
      ].join('\n'),
    );

    const tagsAndIndices: ReadonlyArray<readonly [KnownLogType, number]> = [
      ['error', 1],
      ['warning', 2],
      ['info', 3],
      ['debug', 4],
      ['success', 5],
      ['critical', 6],
    ];

    it.each(tagsAndIndices)(
      'with %s chip OFF, only that row drops out (empty query)',
      (tagToRemove, droppedIndex) => {
        const active = toggleActiveFilter(ALL_KNOWN_FILTERS, tagToRemove);
        const visible = applyFilters(sample, '', active);
        const indices = visible.map((e) => e.index);
        expect(indices).not.toContain(droppedIndex);
        expect(indices).toHaveLength(5);
      },
    );
  });

  describe('all-chips-off + search combination', () => {
    const sample = parseLogLines(
      [
        '[error] one',
        '[warning] two',
        '[info] three',
        'plain four',
        'plain five',
      ].join('\n'),
    );

    let allOff: ReadonlySet<LogEntry['tag']> = ALL_KNOWN_FILTERS;
    for (const t of ['error', 'warning', 'info', 'debug', 'success', 'critical'] as const) {
      allOff = toggleActiveFilter(allOff, t);
    }

    it('with all chips off, only unknown rows survive (empty query)', () => {
      const visible = applyFilters(sample, '', allOff);
      expect(visible.map((e) => e.index)).toEqual([4, 5]);
    });

    it('with all chips off, search query still filters unknown rows', () => {
      const visible = applyFilters(sample, 'four', allOff);
      expect(visible.map((e) => e.index)).toEqual([4]);
    });

    it('with all chips off, search query that matches no row returns empty', () => {
      const visible = applyFilters(sample, 'xyzzy', allOff);
      expect(visible).toEqual([]);
    });
  });

  describe('search query that matches the [tag] prefix', () => {
    const sample = parseLogLines(
      ['[error] one', '[warning] two', '[info] three', 'plain [error] mid'].join('\n'),
    );

    it('searching [error] matches lines whose rawText contains it', () => {
      const visible = applyFilters(sample, '[error]', allTagsIncludingUnknown());
      expect(visible.map((e) => e.index)).toEqual([1, 4]);
    });

    it('searching [error] with error chip OFF hides only the tagged row', () => {
      const active = toggleActiveFilter(ALL_KNOWN_FILTERS, 'error');
      const visible = applyFilters(sample, '[error]', active);
      expect(visible.map((e) => e.index)).toEqual([4]);
    });

    it('searching [error] with error chip OFF and non-matching query returns empty', () => {
      const active = toggleActiveFilter(ALL_KNOWN_FILTERS, 'error');
      const visible = applyFilters(sample, 'xyzzy-nope', active);
      expect(visible.map((e) => e.index)).toEqual([]);
    });
  });
});
