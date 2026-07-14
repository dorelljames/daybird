export function isNewerVersion(current: string, candidate: string): boolean {
  const parse = (v: string) => v.replace(/^v/i, "").split(".").map((n) => parseInt(n, 10) || 0);
  const a = parse(current);
  const b = parse(candidate);
  for (let i = 0; i < 3; i++) {
    if ((b[i] ?? 0) > (a[i] ?? 0)) return true;
    if ((b[i] ?? 0) < (a[i] ?? 0)) return false;
  }
  return false;
}
