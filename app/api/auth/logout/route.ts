import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sessionCookieName } from "@/lib/session-token";

export async function POST() {
  const store = await cookies();
  store.delete(sessionCookieName());
  return NextResponse.json({ ok: true });
}
