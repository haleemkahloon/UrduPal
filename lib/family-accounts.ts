import type { User } from "@supabase/supabase-js";

/** Learner accounts (Ibraheem, Aiza). Keys are normalized for matching. */
const STUDENT_KEYS = new Set(["ibraheem", "aiza"]);

/** Parent / guardian accounts. */
const PARENT_KEYS = new Set(["haleemkahloon"]);

export type FamilyRole = "student" | "parent";

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

/**
 * Resolve learner vs parent from Supabase `user_metadata` or from the email
 * local-part / username (e.g. ibraheem@… → student, haleemkahloon@… → parent).
 * Optional: set `user_metadata.family_role` to `"student"` | `"parent"` in Supabase.
 */
export function getFamilyRoleFromUser(user: User): FamilyRole | null {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fromMeta = meta?.family_role ?? meta?.app_role;
  if (fromMeta === "student" || fromMeta === "parent") return fromMeta;
  if (fromMeta === "learner") return "student";

  const candidates: string[] = [];
  if (typeof meta?.username === "string") candidates.push(norm(meta.username));
  if (typeof meta?.full_name === "string") candidates.push(norm(meta.full_name));
  if (user.email) candidates.push(norm(user.email.split("@")[0] ?? ""));

  for (const c of candidates) {
    if (!c) continue;
    if (STUDENT_KEYS.has(c)) return "student";
    if (PARENT_KEYS.has(c)) return "parent";
  }
  return null;
}
