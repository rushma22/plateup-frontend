/**
 * How many milliseconds remain until autoCloseAt.
 * Uses the backend timestamp so a page refresh keeps the same deadline.
 */
export function msUntilAutoClose(
  autoCloseAt: string | null | undefined,
  nowMs: number = Date.now()
): number {
  if (!autoCloseAt) {
    return 0;
  }
  const target = Date.parse(autoCloseAt);
  if (Number.isNaN(target)) {
    return 0;
  }
  return Math.max(0, target - nowMs);
}

/** Friendly mm:ss (or h:mm:ss) leftover for the closing banner. */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}
