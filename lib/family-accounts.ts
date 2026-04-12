/** Learner accounts (Ibraheem, Aiza). Keys are normalized for matching. */
const STUDENT_KEYS = new Set(["ibraheem", "aiza"]);

/** Parent / guardian accounts. */
const PARENT_KEYS = new Set(["haleemkahloon"]);

export type FamilyRole = "student" | "parent";

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

/**
 * Resolve learner vs parent from the signed-in username (lowercased in DB).
 */
export function getFamilyRoleFromUsername(
  username: string | null | undefined,
): FamilyRole | null {
  if (!username) return null;
  const c = norm(username);
  if (STUDENT_KEYS.has(c)) return "student";
  if (PARENT_KEYS.has(c)) return "parent";
  return null;
}
