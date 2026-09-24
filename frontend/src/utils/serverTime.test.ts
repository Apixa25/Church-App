import { parseServerTimestamp, formatRelativeShort, formatMessageTime } from './serverTime';

describe('parseServerTimestamp', () => {
  it('treats offset-less ISO strings (Spring LocalDateTime) as UTC', () => {
    const date = parseServerTimestamp('2026-09-23T14:05:09');
    expect(date?.toISOString()).toBe('2026-09-23T14:05:09.000Z');
  });

  it('respects explicit offsets', () => {
    expect(parseServerTimestamp('2026-09-23T14:05:09Z')?.toISOString()).toBe('2026-09-23T14:05:09.000Z');
    expect(parseServerTimestamp('2026-09-23T10:05:09-04:00')?.toISOString()).toBe('2026-09-23T14:05:09.000Z');
  });

  it('treats legacy numeric arrays as UTC (month is 1-based)', () => {
    const date = parseServerTimestamp([2026, 9, 23, 14, 5, 9, 123000000]);
    expect(date?.toISOString()).toBe('2026-09-23T14:05:09.123Z');
  });

  it('returns null for empty or invalid input', () => {
    expect(parseServerTimestamp(null)).toBeNull();
    expect(parseServerTimestamp(undefined)).toBeNull();
    expect(parseServerTimestamp('')).toBeNull();
    expect(parseServerTimestamp('not a date')).toBeNull();
  });
});

describe('formatRelativeShort', () => {
  const now = new Date('2026-09-23T12:00:00Z');

  it('produces compact relative labels', () => {
    expect(formatRelativeShort('2026-09-23T11:59:40', now)).toBe('Just now');
    expect(formatRelativeShort('2026-09-23T11:45:00', now)).toBe('15m');
    expect(formatRelativeShort('2026-09-23T09:00:00', now)).toBe('3h');
    expect(formatRelativeShort('2026-09-21T12:00:00', now)).toBe('2d');
  });

  it('returns an empty string when there is no timestamp', () => {
    expect(formatRelativeShort(undefined, now)).toBe('');
  });
});

describe('formatMessageTime', () => {
  it('shows "Just now" for pending messages without a server timestamp', () => {
    expect(formatMessageTime(undefined)).toBe('Just now');
  });
});
