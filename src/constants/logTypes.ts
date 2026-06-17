import type { LogType, KnownLogType } from '../types/log';

export const KNOWN_TAGS: ReadonlySet<KnownLogType> = new Set<KnownLogType>([
  'error',
  'warning',
  'info',
  'debug',
  'success',
  'critical',
]);

export const LOG_TYPE_ORDER: readonly KnownLogType[] = [
  'error',
  'warning',
  'info',
  'debug',
  'success',
  'critical',
];

export const TAG_LABEL: Record<LogType, string> = {
  error: '[error]',
  warning: '[warning]',
  info: '[info]',
  debug: '[debug]',
  success: '[success]',
  critical: '[critical]',
  unknown: '',
};
