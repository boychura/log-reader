import { describe, it, expect } from 'vitest';
import { KNOWN_TAGS, LOG_TYPE_ORDER, TAG_LABEL } from './logTypes';
import type { KnownLogType, LogType } from '../types/log';

// AC-15: dedicated unit tests for the constants module. The parser tests
// verify KNOWN_TAGS indirectly, but the labels + ordering + set shape are
// part of the AC-10 chip-rendering contract and deserve direct coverage.
describe('logTypes constants', () => {
  describe('KNOWN_TAGS', () => {
    it('contains exactly the six documented log types', () => {
      expect([...KNOWN_TAGS].sort()).toEqual(
        (['critical', 'debug', 'error', 'info', 'success', 'warning'] as KnownLogType[]).sort(),
      );
    });

    it('does NOT include the unknown sentinel', () => {
      expect(KNOWN_TAGS.has('unknown' as KnownLogType)).toBe(false);
    });

    it('has exactly six members', () => {
      // Standalone size assertion — complements the membership tests
      // above by catching accidental additions/removals without relying
      // on the order of declarations.
      expect(KNOWN_TAGS.size).toBe(6);
    });

    it.each(['error', 'warning', 'info', 'debug', 'success', 'critical'] as const)(
      'contains the "%s" tag',
      (tag) => {
        expect(KNOWN_TAGS.has(tag)).toBe(true);
      },
    );
  });

  describe('LOG_TYPE_ORDER', () => {
    it('has exactly six entries in canonical order', () => {
      expect(LOG_TYPE_ORDER).toEqual([
        'error',
        'warning',
        'info',
        'debug',
        'success',
        'critical',
      ]);
    });

    it('contains no duplicates', () => {
      expect(new Set(LOG_TYPE_ORDER).size).toBe(LOG_TYPE_ORDER.length);
    });

    it('contains exactly the same members as KNOWN_TAGS', () => {
      expect(new Set(LOG_TYPE_ORDER)).toEqual(KNOWN_TAGS);
    });
  });

  describe('TAG_LABEL', () => {
    it.each(LOG_TYPE_ORDER)('formats "%s" with square brackets', (tag) => {
      expect(TAG_LABEL[tag]).toBe(`[${tag}]`);
    });

    it('returns an empty string for the unknown sentinel', () => {
      expect(TAG_LABEL['unknown' satisfies LogType]).toBe('');
    });

    it('has a label for every LogType member', () => {
      const allTypes: LogType[] = [
        'error',
        'warning',
        'info',
        'debug',
        'success',
        'critical',
        'unknown',
      ];
      for (const t of allTypes) {
        expect(TAG_LABEL).toHaveProperty(t);
      }
    });
  });
});
