// Duration text: "30m", "1h", "1h30m", "1h 30m", bare "45" (minutes).
const DURATION = /^\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m?)?\s*$/i;

export function parseDuration(text: string): number | undefined {
  const m = text.match(DURATION);
  if (!m || (m[1] === undefined && m[2] === undefined)) return undefined;
  const min = (m[1] ? parseInt(m[1], 10) * 60 : 0) + (m[2] ? parseInt(m[2], 10) : 0);
  return min > 0 ? min : undefined;
}

// Trailing "~<duration>" on a title sets the estimate — a quiet nicety.
// Only at the end of the string, so titles that merely mention "~20m" survive.
const MARKER = /\s~(?:(\d+)\s*h)?\s*(?:(\d+)\s*m?)?\s*$/i;

export function parseQuickAdd(input: string): { title: string; estimateMin: number | undefined } {
  const m = input.match(MARKER);
  if (m && (m[1] !== undefined || m[2] !== undefined)) {
    const min = (m[1] ? parseInt(m[1], 10) * 60 : 0) + (m[2] ? parseInt(m[2], 10) : 0);
    if (min > 0) return { title: input.slice(0, m.index).trim(), estimateMin: min };
  }
  return { title: input.trim(), estimateMin: undefined };
}
