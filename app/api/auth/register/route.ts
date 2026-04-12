import { hashSync } from "bcryptjs";
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
    if (username.length > 200 || password.length > 2000) {
      return NextResponse.json({ error: "Input too long." }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const password_hash = hashSync(password, 10);
    const { data, error } = await supabase
      .from("urdupal_local_accounts")
      .insert({ username, password_hash })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "That username is already taken." },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const token = await signSessionToken({
      sub: data.id,
      username,
    });
    const store = await cookies();
    store.set(sessionCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({ user: { id: data.id, username } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg.includes("SUPABASE_SERVICE_ROLE_KEY") || msg.includes("AUTH_SECRET")) {
      return NextResponse.json({ error: "Server is not configured for sign-up." }, { status: 503 });
    }
    console.error(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
