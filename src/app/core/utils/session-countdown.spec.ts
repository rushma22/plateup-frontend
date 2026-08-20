import {
  formatCountdown,
  msUntilAutoClose,
} from './session-countdown';

describe('session-countdown utils', () => {
  it('calculates remaining ms from backend autoCloseAt', () => {
    const now = Date.parse('2026-07-24T12:00:00.000Z');
    const autoCloseAt = '2026-07-24T12:10:00.000Z';
    expect(msUntilAutoClose(autoCloseAt, now)).toBe(10 * 60_000);
  });

  it('returns 0 when the deadline has passed', () => {
    const now = Date.parse('2026-07-24T12:20:00.000Z');
    const autoCloseAt = '2026-07-24T12:10:00.000Z';
    expect(msUntilAutoClose(autoCloseAt, now)).toBe(0);
  });

  it('returns 0 for missing or invalid timestamps', () => {
    expect(msUntilAutoClose(null)).toBe(0);
    expect(msUntilAutoClose(undefined)).toBe(0);
    expect(msUntilAutoClose('not-a-date', Date.now())).toBe(0);
  });

  it('formats countdown as mm:ss', () => {
    expect(formatCountdown(90_000)).toBe('01:30');
    expect(formatCountdown(0)).toBe('00:00');
  });

  it('formats longer countdowns with hours', () => {
    expect(formatCountdown(3_661_000)).toBe('1:01:01');
  });
});
