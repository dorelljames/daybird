const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function fractionsFromBoundaries(b1: number, b2: number): [number, number, number] {
  const x1 = clamp01(b1);
  const x2 = Math.max(clamp01(b2), x1);
  return [x1, x2 - x1, 1 - x2];
}

export function allocate(totalMin: number, fractions: number[]): number[] {
  const raw = fractions.map((f) => totalMin * f);
  const base = raw.map(Math.floor);
  let left = totalMin - base.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => [r - base[i], i] as const)
    .sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (left <= 0) break;
    base[i]++;
    left--;
  }
  return base;
}
