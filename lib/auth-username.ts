/**
 * Supabase `signInWithPassword` / `signUp` use Auth’s **email** field internally.
 * Sign-in accepts:
 * - Full email — used as-is (legacy / admin)
 * - Username only — combined with `NEXT_PUBLIC_AUTH_EMAIL_DOMAIN` (default example.com)
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
  // example.com is reserved for documentation; Supabase accepts it as a valid-format
  // synthetic address. Avoid gmail.com/yahoo.com here — some projects reject them.
  const domain =
    process.env.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN?.trim() || "example.com";
  const host = domain.replace(/^@/, "");
  return {
    email: `${trimmed.toLowerCase()}@${host}`,
    error: null,
  };
}
