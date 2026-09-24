/**
 * Chat timestamp helpers.
 *
 * The backend stores chat times as UTC `LocalDateTime` and serializes them as ISO-8601 strings
 * without an offset (e.g. "2026-09-23T14:05:09"). Historically the STOMP path serialized them as
 * numeric arrays instead. Both forms are accepted here and always interpreted as UTC so REST and
 * WebSocket payloads render identically.
 */
export type ServerTimestamp = string | number[] | null | undefined;

export const parseServerTimestamp = (value: ServerTimestamp): Date | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  let date: Date;

  if (Array.isArray(value)) {
    const [year, month, day, hour = 0, minute = 0, second = 0, nanos = 0] = value;
    if (typeof year !== 'number' || typeof month !== 'number' || typeof day !== 'number') {
      return null;
    }
    date = new Date(Date.UTC(year, month - 1, day, hour, minute, second, Math.floor(nanos / 1_000_000)));
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
    const hasTime = trimmed.includes('T');
    date = new Date(hasTime && !hasOffset ? `${trimmed}Z` : trimmed);
  } else {
    return null;
  }

  return Number.isNaN(date.getTime()) ? null : date;
};

/** "14:05" style clock time in the viewer's locale; "Just now" for pending messages. */
export const formatMessageTime = (value: ServerTimestamp): string => {
  const date = parseServerTimestamp(value);
  if (!date) {
    return 'Just now';
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/** Compact relative label for list rows: "Just now", "5m", "3h", "2d". */
export const formatRelativeShort = (value: ServerTimestamp, now: Date = new Date()): string => {
  const date = parseServerTimestamp(value);
  if (!date) {
    return '';
  }

  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
};

/** Time-of-day for today's items, otherwise a locale date (used by search results). */
export const formatTimeOrDate = (value: ServerTimestamp, now: Date = new Date()): string => {
  const date = parseServerTimestamp(value);
  if (!date) {
    return '';
  }
  const hours = (now.getTime() - date.getTime()) / 3_600_000;
  return hours < 24
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString();
};
