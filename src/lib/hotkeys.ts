export interface KeyLike {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export function matchHotkey(e: KeyLike, spec: string): boolean {
  const parts = spec.toLowerCase().split("+");
  const key = parts.pop()!;
  const wantMod = parts.includes("mod");
  const wantShift = parts.includes("shift");
  const wantAlt = parts.includes("alt");
  if ((e.metaKey || e.ctrlKey) !== wantMod) return false;
  if (e.shiftKey !== wantShift) return false;
  if (e.altKey !== wantAlt) return false;
  const k = e.key === " " ? "space" : e.key.toLowerCase();
  return k === key;
}
