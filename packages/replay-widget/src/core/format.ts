/** Zero-pad a number to two digits. */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Format a duration in seconds as `H:MM:SS` (or `MM:SS` under an hour). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (hours > 0) return `${hours}:${pad2(minutes)}:${pad2(seconds)}`;
  return `${pad2(minutes)}:${pad2(seconds)}`;
}

/** Format an interval/gap in seconds as `+1.234s`, or an em dash when null. */
export function formatGap(seconds: number | null): string {
  if (seconds === null || Number.isNaN(seconds)) return '—';
  if (seconds === 0) return 'Leader';
  return `+${seconds.toFixed(3)}s`;
}

/** Format a future race date for the "next race" card. */
export function formatRaceDate(iso: string | null): string {
  if (!iso) return 'Date TBC';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Date TBC';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
