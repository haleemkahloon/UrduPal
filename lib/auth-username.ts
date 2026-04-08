/**
 * Supabase `signInWithPassword` / `signUp` use Auth’s **email** field internally.
 * Sign-in accepts:
 * - Full email — used as-is (legacy / admin)
 * - Username only — combined with `NEXT_PUBLIC_AUTH_EMAIL_DOMAIN` (default gmail.com)
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

  // Short name → email. Domain must match Auth "Email" in Supabase (part after @).
  // Override with NEXT_PUBLIC_AUTH_EMAIL_DOMAIN (e.g. yahoo.com, outlook.com, yourdomain.com).
  const domain =
    process.env.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN?.trim() || "gmail.com";
  const host = domain.replace(/^@/, "");
  return {
    email: `${trimmed.toLowerCase()}@${host}`,
    error: null,
  };
}
