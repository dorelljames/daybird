// Trailing "~30m" / "~1h" / "~1h30m" / "~45" on a title sets the estimate.
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
