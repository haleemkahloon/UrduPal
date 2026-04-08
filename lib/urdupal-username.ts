/** Usernames for UrduPal sign-up (no email — stored identity is username only in the UI). */
const URDUPAL_USERNAME_PATTERN = /^[a-zA-Z0-9._-]{2,32}$/;

export function isValidUrduPalUsername(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  if (s.includes("@")) return false;
  return URDUPAL_USERNAME_PATTERN.test(s);
}
