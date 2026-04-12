import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/session-request";

export async function GET() {
  try {
    const user = await getSessionFromCookies();
    return NextResponse.json({ user });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg.includes("AUTH_SECRET")) {
      return NextResponse.json(
        { user: null, error: "Server misconfigured (AUTH_SECRET)" },
        { status: 503 },
      );
    }
    return NextResponse.json({ user: null, error: msg }, { status: 500 });
  }
}
