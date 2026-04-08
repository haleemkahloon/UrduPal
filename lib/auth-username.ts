/**
 * Supabase `signInWithPassword` / `signUp` use Auth’s **email** field internally.
 * Sign-in accepts:
 * - Full email — used as-is (legacy / admin)
 * - Username only — combined with `NEXT_PUBLIC_AUTH_EMAIL_DOMAIN` (see default below)
 */
export function usernameInputToAuthEmail(input: string): {
  email: string | null;
  error: string | null;
} {
  const trimmed = input.trim();
  if (!trimmed) return { email: null, error: null };

  if (trimmed.includes("@")) {
    return { email: trimmed.toLowerCase(), error: null };
  }

  // Short name → synthetic email. Do NOT use gmail.com/yahoo.com etc. — Supabase Auth
  // often rejects those as invalid for fake inboxes. `.invalid` is RFC-reserved (not real mail).
  // Override with NEXT_PUBLIC_AUTH_EMAIL_DOMAIN if you use a custom domain you control.
  const domain =
    process.env.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN?.trim() || "urdupal.invalid";
  const host = domain.replace(/^@/, "");
  return {
    email: `${trimmed.toLowerCase()}@${host}`,
    error: null,
  };
}
