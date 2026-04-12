import { compareSync } from "bcryptjs";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { normalizeUsername } from "@/lib/local-auth";
import { getServiceSupabase } from "@/lib/supabase/service";
import { sessionCookieName, signSessionToken } from "@/lib/session-token";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { username?: string; password?: string };
    const username = normalizeUsername(body.username ?? "");
    const password = typeof body.password === "string" ? body.password : "";
    if (!username.length || !password.length) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 },
      );
    }

    const supabase = getServiceSupabase();
    const { data: row, error } = await supabase
      .from("urdupal_local_accounts")
      .select("id, password_hash")
      .eq("username", username)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!row || !compareSync(password, row.password_hash)) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 },
      );
    }

    const token = await signSessionToken({ sub: row.id, username });
    const store = await cookies();
    store.set(sessionCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({ user: { id: row.id, username } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg.includes("SUPABASE_SERVICE_ROLE_KEY") || msg.includes("AUTH_SECRET")) {
      return NextResponse.json({ error: "Server is not configured for sign-in." }, { status: 503 });
    }
    console.error(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
