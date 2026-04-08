/**
 * Supabase `signInWithPassword` expects the Auth user’s **email** field.
 * Your existing users in Supabase still have an email stored — often
 * `username@yourdomain.com`. Users can sign in with:
 * - Full email (`you@example.com`) — used as-is
 * - Username only (`haleem`) — combined with `NEXT_PUBLIC_AUTH_EMAIL_DOMAIN`
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
