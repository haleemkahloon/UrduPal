import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "urdupal_session";

export function sessionCookieName(): string {
  return COOKIE_NAME;
}

function getSecret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error("AUTH_SECRET must be set and at least 32 characters");
  }
  return new TextEncoder().encode(s);
}

export async function signSessionToken(payload: {
  sub: string;
  username: string;
}): Promise<string> {
  return new SignJWT({ username: payload.username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<{ id: string; username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const sub = payload.sub;
    const username =
      typeof payload.username === "string" ? payload.username : "";
    if (!sub || !username) return null;
    return { id: sub, username };
  } catch {
    return null;
  }
}
