import { describe, it, expect } from 'vitest';
import { joinVisibleLines } from './copy';
import type { LogEntry } from '../types/log';

const entry = (index: number, rawText: string, tag: LogEntry['tag'] = 'unknown'): LogEntry => ({
  index,
  rawText,
  tag,
  content: rawText,
});

describe('joinVisibleLines (AC-12)', () => {
  it('joins multiple lines with \\n', () => {
    expect(
      joinVisibleLines([
        entry(1, '[info] first'),
        entry(2, '[error] second'),
        entry(3, 'plain third'),
      ]),
    ).toBe('[info] first\n[error] second\nplain third');
  });

  it('returns an empty string for an empty input', () => {
    expect(joinVisibleLines([])).toBe('');
  });

  it('returns the single line unchanged when there is only one entry', () => {
    expect(joinVisibleLines([entry(1, 'only line')])).toBe('only line');
  });

  it('preserves the original rawText — including leading [tag] prefixes', () => {
    // Critical: AC-12 says "preserving their original text", which means
    // the [error] chip text must be copied verbatim, not the stripped
    // `content` field.
    expect(joinVisibleLines([entry(1, '[error] something failed')])).toBe(
      '[error] something failed',
    );
  });

  it('preserves internal whitespace, tabs, and trailing spaces', () => {
    expect(joinVisibleLines([entry(1, 'a   b\tc '), entry(2, 'd')])).toBe(
      'a   b\tc \nd',
    );
  });

  it('preserves original line ordering (no sort)', () => {
    // Even after filtering, visibleEntries keep their original index
    // order. The join helper must not resort.
    const visible = [
      entry(7, 'seven'),
      entry(2, 'two'),
      entry(5, 'five'),
    ];
    expect(joinVisibleLines(visible)).toBe('seven\ntwo\nfive');
  });

  it('does not add a trailing newline', () => {
    // Plan explicitly says "joined by \\n" — no trailing newline.
    expect(
      joinVisibleLines([entry(1, 'a'), entry(2, 'b')]),
    ).toBe('a\nb');
    expect(
      joinVisibleLines([entry(1, 'a')]),
    ).toBe('a');
  });

  it('handles blank/empty rawText rows (preserves them as empty strings)', () => {
    expect(
      joinVisibleLines([
        entry(1, 'top'),
        entry(2, ''),
        entry(3, 'bottom'),
      ]),
    ).toBe('top\n\nbottom');
  });
});
