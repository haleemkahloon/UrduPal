const MAX_USERNAME_LEN = 128;

/**
 * Register with any non-empty name (no `@`, no whitespace). Keeps synthetic emails valid.
 */
export function isValidUrduPalUsername(raw: string): boolean {
  const s = raw.trim();
  if (!s.length || s.length > MAX_USERNAME_LEN) return false;
  if (s.includes("@")) return false;
  if (/\s/.test(s)) return false;
  return true;
}
