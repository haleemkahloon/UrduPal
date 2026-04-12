import { cookies } from "next/headers";
import {
  sessionCookieName,
  verifySessionToken,
} from "@/lib/session-token";

export async function getSessionFromCookies(): Promise<{
  id: string;
  username: string;
} | null> {
  const store = await cookies();
  const raw = store.get(sessionCookieName())?.value;
  if (!raw) return null;
  return verifySessionToken(raw);
}
