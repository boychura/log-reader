import type { LogType } from '../types/log';
import { FILTER_ORDER } from '../constants/logTypes';
import { ALL_KNOWN_FILTERS, makeActiveFilters, type ActiveFilters } from './filter';

export interface HashState {
  search: string;
  filters: ActiveFilters;
}

export function parseHash(hash: string): HashState {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const search = params.get('q') ?? '';
  const filtersParam = params.get('f');
  let filters: ActiveFilters;
  if (filtersParam === null) {
    filters = ALL_KNOWN_FILTERS;
  } else if (filtersParam === '') {
    filters = new Set<LogType>();
  } else {
    filters = makeActiveFilters(filtersParam.split(',') as LogType[]);
  }
  return { search, filters };
}

export function buildHash(search: string, filters: ActiveFilters): string {
  const params = new URLSearchParams();
  if (search) params.set('q', search);
  const allActive = FILTER_ORDER.every((t) => filters.has(t));
  if (!allActive) {
    params.set('f', [...filters].join(','));
  }
  const str = params.toString();
  return str ? `#${str}` : '';
}
