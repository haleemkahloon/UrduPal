import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/session-request";
import { getServiceSupabase } from "@/lib/supabase/service";
import type { UserProgress } from "@/lib/types";

const defaultProgress: UserProgress = {
  xp: 0,
  streak: 0,
  lessons_done: 0,
  completed: {},
};

export async function GET() {
  const user = await getSessionFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("urdupal_progress")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data) {
      return NextResponse.json({ progress: defaultProgress });
    }
    const progress: UserProgress = {
      xp: data.xp ?? 0,
      streak: data.streak ?? 0,
      lessons_done: data.lessons_done ?? 0,
      completed: (data.completed as Record<string, boolean>) ?? {},
    };
    return NextResponse.json({ progress });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const user = await getSessionFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as UserProgress;
    const supabase = getServiceSupabase();
    const { error } = await supabase.from("urdupal_progress").upsert(
      {
        user_id: user.id,
        xp: body.xp,
        streak: body.streak,
        lessons_done: body.lessons_done,
        completed: body.completed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
