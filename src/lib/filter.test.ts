import { describe, it, expect } from 'vitest';
import {
  applyFilters,
  ALL_KNOWN_FILTERS,
  makeActiveFilters,
  toggleActiveFilter,
  type ActiveFilters,
} from './filter';
import { parseLogLines } from './parser';
import type { LogEntry, KnownLogType } from '../types/log';

// Active set that includes 'unknown' so tests can exercise the unknown-tag
// path. (The default UI active set is the six known tags only — see
// ALL_KNOWN_FILTERS — but for search-filter unit tests we want to assert
// behavior across the full range of tags.)
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

const allKnown = (): Set<LogEntry['tag']> =>
  new Set<LogEntry['tag']>(['error', 'warning', 'info', 'debug', 'success', 'critical']);

describe('applyFilters - AC-9 search filtering', () => {
  describe('case-insensitive substring match', () => {
    const sample = parseLogLines(
      [
        '[info] Database connection established',
        '[error] Database connection refused',
        '[info] User logged in',
        'plain text mentioning database in lower case',
        '[warning] memory usage high',
      ].join('\n'),
    );

    it('returns all rows for empty query', () => {
      expect(applyFilters(sample, '', allTagsIncludingUnknown())).toHaveLength(sample.length);
    });

    it('returns all rows for whitespace-only query', () => {
      expect(applyFilters(sample, '   \t  ', allTagsIncludingUnknown())).toHaveLength(sample.length);
    });

    it('filters rows that contain the substring (case-insensitive)', () => {
      const visible = applyFilters(sample, 'database', allTagsIncludingUnknown());
      expect(visible.map((e) => e.index)).toEqual([1, 2, 4]);
    });

    it('matches uppercase query against mixed-case content', () => {
      const visible = applyFilters(sample, 'DATABASE', allTagsIncludingUnknown());
      expect(visible.map((e) => e.index)).toEqual([1, 2, 4]);
    });

    it('matches lowercase query against mixed-case content', () => {
      const visible = applyFilters(sample, 'database', allTagsIncludingUnknown());
      expect(visible.map((e) => e.index)).toEqual([1, 2, 4]);
    });

    it('matches TitleCase query against mixed-case content', () => {
      const visible = applyFilters(sample, 'Database', allTagsIncludingUnknown());
      expect(visible.map((e) => e.index)).toEqual([1, 2, 4]);
    });

    it('returns empty array when no row matches', () => {
      expect(applyFilters(sample, 'no-such-substring-xyz', allTagsIncludingUnknown())).toEqual([]);
    });
  });

  describe('preserves original line numbers (no renumbering)', () => {
    const sample = parseLogLines(
      [
        '[info] one',         // index 1
        '[error] two',        // index 2
        'plain three',        // index 3
        '[warning] four',     // index 4
        '[debug] five',       // index 5
      ].join('\n'),
    );

    it('kept rows keep their original 1-based index', () => {
      const visible = applyFilters(sample, 't', allTagsIncludingUnknown());
      // Line 1 "[info] one" — no "t".   (one, info)
      // Line 2 "[error] two" — has "t".
      // Line 3 "plain three" — has "t".
      // Line 4 "[warning] four" — no "t". (warning, four)
      // Line 5 "[debug] five" — no "t".   (debug, five)
      expect(visible.map((e) => e.index)).toEqual([2, 3]);
    });

    it('preserves the original array order (no sorting)', () => {
      const visibleSubset = applyFilters(sample, 'i', allTagsIncludingUnknown());
      // Indices that contain "i": 1 ("one"), 2 ("two" no), 3 ("plain" yes), 4 ("warning" yes), 5 ("five" yes).
      // So expected order: [1, 3, 4, 5].
      expect(visibleSubset.map((e) => e.index)).toEqual([1, 3, 4, 5]);
    });

    it('returns a new array reference (does not mutate the input)', () => {
      const visible = applyFilters(sample, 'two', allTagsIncludingUnknown());
      expect(visible).not.toBe(sample);
      expect(sample).toHaveLength(5); // unchanged
    });

    it('preserves all LogEntry fields on kept rows', () => {
      const visible = applyFilters(sample, 'two', allTagsIncludingUnknown());
      expect(visible).toHaveLength(1);
      expect(visible[0]).toEqual({
        index: 2,
        rawText: '[error] two',
        tag: 'error',
        content: 'two',
      });
    });
  });

  describe('whitespace and edge cases', () => {
    const sample = parseLogLines(
      [
        '[info]   padded   spaces',
        '[info]	tab	inside',
        '[info] trailing space ',
        '[info] leading-tab-content',
      ].join('\n'),
    );

    it('matches whitespace literally (preserves inner whitespace)', () => {
      const visible = applyFilters(sample, '  padded   spaces', allTagsIncludingUnknown());
      expect(visible.map((e) => e.index)).toEqual([1]);
    });

    it('matches tab characters literally', () => {
      const visible = applyFilters(sample, 'tab\tinside', allTagsIncludingUnknown());
      expect(visible.map((e) => e.index)).toEqual([2]);
    });

    it('trims query whitespace before searching', () => {
      const visible = applyFilters(sample, '   padded   ', allTagsIncludingUnknown());
      expect(visible.map((e) => e.index)).toEqual([1]);
    });

    it('matches against the full rawText including the [tag] prefix', () => {
      // "[info]" is part of rawText on every line, so searching "[info]" matches all 4.
      const visible = applyFilters(sample, '[info]', allTagsIncludingUnknown());
      expect(visible).toHaveLength(4);
    });
  });

  describe('empty / degenerate inputs', () => {
    it('returns empty array for empty entries', () => {
      expect(applyFilters([], 'anything', allTagsIncludingUnknown())).toEqual([]);
    });

    it('returns empty array when active set is empty AND no rows are unknown', () => {
      // Only known-tagged rows: with no active chips, nothing passes.
      const sample = parseLogLines('[info] one\n[error] two');
      expect(applyFilters(sample, '', new Set())).toEqual([]);
      expect(applyFilters(sample, 'one', new Set())).toEqual([]);
    });

    it('still passes unknown rows through even with an empty active set', () => {
      // Unknown rows have no chip in AC-10, so they must NOT be dropped
      // when every chip is deactivated. They only get filtered out by
      // the search query (since search is the only way to hide them).
      const sample = parseLogLines('[info] one\nplain two\n[error] three');
      expect(applyFilters(sample, '', new Set())).toEqual([
        expect.objectContaining({ index: 2, tag: 'unknown' }),
      ]);
      expect(applyFilters(sample, 'two', new Set())).toEqual([
        expect.objectContaining({ index: 2, tag: 'unknown' }),
      ]);
    });
  });

  describe('tag filter composition (forward-compat with AC-10)', () => {
    const sample = parseLogLines(
      [
        '[error] alpha',     // 1
        '[warning] beta',    // 2
        '[info] gamma',      // 3
        '[debug] delta',     // 4
        '[success] epsilon', // 5
        '[critical] zeta',   // 6
        'plain eta',         // 7
      ].join('\n'),
    );

    it('with empty query, filters by tag only (unknown row still passes)', () => {
      const visible = applyFilters(sample, '', new Set(['error'] as const));
      // Row 7 ('plain eta') has tag 'unknown' which always passes the
      // tag check, regardless of the active set.
      expect(visible.map((e) => e.index)).toEqual([1, 7]);
    });

    it('with non-empty query, requires BOTH tag and substring match (unknown row still passes)', () => {
      const visible = applyFilters(
        sample,
        'a',
        new Set(['error', 'warning', 'info'] as const),
      );
      // 'a' matches: 1 'alpha', 2 'beta', 3 'gamma', 7 'plain eta'.
      // Of those, 1/2/3 pass the tag filter and 7 always passes (unknown).
      expect(visible.map((e) => e.index)).toEqual([1, 2, 3, 7]);
    });

    it('multi-tag active set is OR, not AND (unknown row still passes)', () => {
      const visible = applyFilters(
        sample,
        '',
        new Set(['error', 'success'] as const),
      );
      expect(visible.map((e) => e.index)).toEqual([1, 5, 7]);
    });

    it('unknown lines pass through when only known tags are active (AC-7 invariant)', () => {
      // Plain / untagged lines have tag='unknown' and there is no AC-10
      // filter chip for 'unknown'. The active-set check must therefore
      // let them through so AC-3 (every line appears) and AC-7
      // (unknown lines render as plain log lines) keep working.
      const visible = applyFilters(sample, '', allKnown());
      expect(visible.map((e) => e.index)).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(visible).toHaveLength(7);
    });

    it('plain/untagged lines remain visible with empty query + ALL_KNOWN_FILTERS (regression for AC-9)', () => {
      // This is the exact App.tsx call shape (`applyFilters(entries, searchQuery,
      // ALL_KNOWN_FILTERS)`). Prior to the fix the unknown row was silently
      // dropped, breaking AC-3 / AC-7 in the rendered UI.
      const visible = applyFilters(sample, '', ALL_KNOWN_FILTERS);
      expect(visible.map((e) => e.index)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('plain/untagged lines still respect the search query', () => {
      // 'plain' only appears on row 7.
      const visible = applyFilters(sample, 'plain', ALL_KNOWN_FILTERS);
      expect(visible.map((e) => e.index)).toEqual([7]);
    });

    it('plain/untagged lines are still hidden when search query excludes them', () => {
      // 'epsilon' only appears on row 5 ([success]).
      const visible = applyFilters(sample, 'epsilon', ALL_KNOWN_FILTERS);
      expect(visible.map((e) => e.index)).toEqual([5]);
    });
  });

  describe('ALL_KNOWN_FILTERS / makeActiveFilters', () => {
    it('ALL_KNOWN_FILTERS contains exactly the six documented tags', () => {
      expect([...ALL_KNOWN_FILTERS].sort()).toEqual(
        (['critical', 'debug', 'error', 'info', 'success', 'warning'] as KnownLogType[]).sort(),
      );
    });

    it('ALL_KNOWN_FILTERS does NOT include unknown', () => {
      expect(ALL_KNOWN_FILTERS.has('unknown')).toBe(false);
    });

    it('makeActiveFilters drops unknown tags', () => {
      const set = makeActiveFilters(['error', 'trace' as 'error', 'warning']);
      expect([...set].sort()).toEqual(['error', 'warning']);
    });

    it('makeActiveFilters returns an empty set for an empty input', () => {
      expect([...makeActiveFilters([])]).toEqual([]);
    });
  });

  describe('toggleActiveFilter (AC-10 chip toggles)', () => {
    it('removes a tag that was active', () => {
      const before: Set<LogEntry['tag']> = new Set([
        'error',
        'warning',
        'info',
        'debug',
        'success',
        'critical',
      ]);
      const after = toggleActiveFilter(before, 'error');
      expect(after.has('error')).toBe(false);
      expect(after.size).toBe(5);
    });

    it('adds a tag that was inactive', () => {
      const before: Set<LogEntry['tag']> = new Set([
        'warning',
        'info',
        'debug',
        'success',
        'critical',
      ]);
      const after = toggleActiveFilter(before, 'error');
      expect(after.has('error')).toBe(true);
      expect(after.size).toBe(6);
    });

    it('returns an empty set when the last active tag is toggled off', () => {
      const before: Set<LogEntry['tag']> = new Set<LogEntry['tag']>(['error']);
      const after = toggleActiveFilter(before, 'error');
      expect([...after]).toEqual([]);
    });

    it('returns a NEW set (does not mutate the input)', () => {
      const before: Set<LogEntry['tag']> = new Set([
        'error',
        'warning',
        'info',
        'debug',
        'success',
        'critical',
      ]);
      const after = toggleActiveFilter(before, 'error');
      expect(after).not.toBe(before);
      expect(before.has('error')).toBe(true);
      expect(before.size).toBe(6);
    });

    it('refuses to toggle the unknown tag (no chip in the UI)', () => {
      const before = allTagsIncludingUnknown();
      expect(() =>
        toggleActiveFilter(before, 'unknown' as KnownLogType),
      ).toThrow(/not a known log type/);
    });

    it('round-trips: toggling a tag on then off restores the original set', () => {
      const before = ALL_KNOWN_FILTERS;
      const off = toggleActiveFilter(before, 'error');
      const back = toggleActiveFilter(off, 'error');
      expect([...back].sort()).toEqual([...before].sort());
    });

    it('toggling off every chip lets unknown rows still pass through applyFilters', () => {
      // AC-10 invariant: with every chip deactivated, known-tagged rows
      // disappear but unknown-tagged rows remain visible (search is the
      // only way to hide them).
      const sample = parseLogLines(
        ['[error] one', 'plain two', '[warning] three'].join('\n'),
      );
      let active: ActiveFilters = new Set([
        'error',
        'warning',
        'info',
        'debug',
        'success',
        'critical',
      ]);
      // Toggle every chip off, one by one.
      for (const tag of ['warning', 'info', 'debug', 'success', 'critical', 'error'] as const) {
        active = toggleActiveFilter(active, tag);
      }
      expect([...active]).toEqual([]);
      const visible = applyFilters(sample, '', active);
      expect(visible.map((e) => e.index)).toEqual([2]);
    });
  });
});
