export const MIN = 60_000;

export function fmtClock(totalSec: number): string {
  const t = Math.max(0, totalSec);
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function fmtMin(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function dayKey(t: number): string {
  const d = new Date(t);
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mo}-${da}`;
}

export function minutesBetween(a: number, b: number): number {
  return Math.round((b - a) / MIN);
}

export function atToday(hour: number, min = 0): number {
  const d = new Date();
  d.setHours(hour, min, 0, 0);
  return d.getTime();
}
