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

  const domain = process.env.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN?.trim();
  if (!domain) {
    return {
      email: null,
      error:
        "Add NEXT_PUBLIC_AUTH_EMAIL_DOMAIN to .env.local (domain used for your Supabase users, e.g. myapp.com), or sign in with your full email address.",
    };
  }

  const host = domain.replace(/^@/, "");
  return {
    email: `${trimmed.toLowerCase()}@${host}`,
    error: null,
  };
}
