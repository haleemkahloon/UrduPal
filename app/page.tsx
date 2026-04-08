"use client";

import type { User } from "@supabase/supabase-js";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { usernameInputToAuthEmail } from "@/lib/auth-username";
import { isValidUrduPalUsername } from "@/lib/urdupal-username";
import { getFamilyRoleFromUser } from "@/lib/family-accounts";
import { LESSONS } from "@/lib/lesson-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ui } from "@/lib/translations";
import type {
  LessonDefinition,
  LessonRuntimeState,
  LessonScreen,
  UserProgress,
} from "@/lib/types";
import { applyStreakForToday, choiceLetter, formatHearts, shuffleInPlace } from "@/lib/utils";

const primaryBtn =
  "w-full rounded-2xl bg-[#58cc02] py-3.5 text-base font-bold text-white shadow-[0_4px_0_#46a302] transition hover:brightness-95 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400 disabled:shadow-none";
const card =
  "rounded-[20px] border border-neutral-200/90 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.03] dark:border-neutral-700 dark:bg-neutral-900 dark:ring-white/10";
const pageBg =
  "min-h-screen bg-[#f0f4f8] dark:bg-neutral-950";
const muted = "text-neutral-500 dark:text-neutral-400";

function AudioWave() {
  return (
    <span className="inline-flex h-4 items-end gap-0.5">
      {[4, 10, 16, 10, 4].map((h, i) => (
        <span
          key={i}
          className="inline-block w-[3px] animate-pulse rounded-sm bg-current"
          style={{
            height: h,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </span>
  );
}

const defaultProgress: UserProgress = {
  xp: 0,
  streak: 0,
  lessons_done: 0,
  completed: {},
};

export default function Home() {
  const supabase = getSupabaseBrowserClient();
  const [booting, setBooting] = useState(!!supabase);
  const [user, setUser] = useState<User | null>(null);
  const [progress, setProgress] = useState<UserProgress>(defaultProgress);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "register">("signin");
  const [signInUsername, setSignInUsername] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [view, setView] = useState<"home" | "lesson">("home");
  const [lessonState, setLessonState] = useState<LessonRuntimeState | null>(
    null,
  );
  const [lessonComplete, setLessonComplete] = useState<{
    lesson: LessonDefinition;
    runtime: LessonRuntimeState;
    accuracy: number;
  } | null>(null);

  const profileRef = useRef<HTMLDivElement>(null);

  const loadUserData = useCallback(
    async (u: User) => {
      if (!supabase) return;
      const [progressRes, profileRes] = await Promise.all([
        supabase
          .from("urdupal_progress")
          .select("*")
          .eq("user_id", u.id)
          .maybeSingle(),
        supabase
          .from("urdupal_app_users")
          .select("username")
          .eq("user_id", u.id)
          .maybeSingle(),
      ]);

      const data = progressRes.data;
      if (data) {
        setProgress({
          xp: data.xp ?? 0,
          streak: data.streak ?? 0,
          lessons_done: data.lessons_done ?? 0,
          completed: data.completed ?? {},
        });
      } else {
        setProgress(defaultProgress);
      }

      if (profileRes.data?.username) {
        setProfileUsername(profileRes.data.username);
      } else {
        setProfileUsername(null);
      }
    },
    [supabase],
  );

  const saveProgress = useCallback(
    async (p: UserProgress) => {
      if (!supabase || !user) return;
      await supabase.from("urdupal_progress").upsert(
        {
          user_id: user.id,
          xp: p.xp,
          streak: p.streak,
          lessons_done: p.lessons_done,
          completed: p.completed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    },
    [supabase, user],
  );

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.user) {
        setUser(session.user);
        await loadUserData(session.user);
      }
      setBooting(false);
    })();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
        await loadUserData(session.user);
      }
      if (event === "SIGNED_OUT") {
        setUser(null);
        setProfileUsername(null);
        setProgress(defaultProgress);
      }
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase, loadUserData]);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2500);
  }

  function usernameForMetadata(raw: string): string {
    const t = raw.trim();
    if (t.includes("@")) return t.split("@")[0]?.toLowerCase() ?? "";
    return t.toLowerCase();
  }

  async function handleSignIn() {
    if (!supabase) return;
    setAuthError("");
    setAuthSuccess("");
    if (!signInUsername.trim() || !signInPassword) {
      setAuthError(ui.auth.fillFields);
      return;
    }
    const { email, error: convertError } = usernameInputToAuthEmail(
      signInUsername,
    );
    if (convertError) {
      setAuthError(convertError);
      return;
    }
    if (!email) {
      setAuthError(ui.auth.fillFields);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: signInPassword,
    });
    if (error) setAuthError(error.message);
  }

  async function handleRegister() {
    if (!supabase) return;
    setAuthError("");
    setAuthSuccess("");
    if (!signInUsername.trim() || !signInPassword) {
      setAuthError(ui.auth.fillFields);
      return;
    }
    if (signInPassword.length < 6) {
      setAuthError(ui.auth.passwordTooShort);
      return;
    }
    if (!isValidUrduPalUsername(signInUsername)) {
      setAuthError(ui.auth.invalidUsername);
      return;
    }
    const { email, error: convertError } = usernameInputToAuthEmail(
      signInUsername,
    );
    if (convertError) {
      setAuthError(convertError);
      return;
    }
    if (!email) {
      setAuthError(ui.auth.fillFields);
      return;
    }
    const { data: emailFree, error: rpcError } = await supabase.rpc(
      "urdupal_auth_email_available",
      { p_email: email },
    );
    if (rpcError) {
      if (
        rpcError.code === "42883" ||
        (rpcError.message.includes("function") &&
          rpcError.message.includes("does not exist"))
      ) {
        setAuthError(ui.auth.databaseSchemaHint);
      } else {
        setAuthError(rpcError.message);
      }
      return;
    }
    if (emailFree === false) {
      setAuthError(ui.auth.registerDuplicate);
      return;
    }
    const metaUser = usernameForMetadata(signInUsername);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: signInPassword,
      options: {
        data: { username: metaUser },
      },
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes("already registered") ||
        msg.includes("user already") ||
        msg.includes("already been registered")
      ) {
        setAuthError(ui.auth.registerDuplicate);
      } else {
        setAuthError(error.message);
      }
      return;
    }
    if (data.session) {
      setAuthSuccess(ui.auth.registerSuccessSession);
      return;
    }
    if (data.user) {
      setAuthSuccess(ui.auth.registerSuccessConfirmEmail);
      setSignInPassword("");
    }
  }

  async function handleSignOut() {
    setProfileOpen(false);
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  const finishLesson = useCallback(
    async (runtime: LessonRuntimeState) => {
      const acc =
        runtime.total > 0
          ? Math.round((runtime.correct / runtime.total) * 100)
          : 100;
      setProgress((prev) => {
        let next: UserProgress = {
          ...prev,
          xp: prev.xp + runtime.xp,
          lessons_done: prev.lessons_done + 1,
          completed: { ...prev.completed, [runtime.key]: true },
        };
        next = applyStreakForToday(next);
        void saveProgress(next);
        return next;
      });
      setLessonComplete({
        lesson: runtime.data,
        runtime,
        accuracy: acc,
      });
    },
    [saveProgress],
  );

  const advanceLesson = useCallback(() => {
    setLessonState((s) => {
      if (!s) return s;
      if (s.screen < s.data.screens.length - 1) {
        return { ...s, screen: s.screen + 1 };
      }
      void finishLesson(s);
      return null;
    });
  }, [finishLesson]);

  const displayName =
    profileUsername ||
    (typeof user?.user_metadata?.username === "string"
      ? user.user_metadata.username
      : null) ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "there";

  const profileIdentifier =
    profileUsername ||
    (typeof user?.user_metadata?.username === "string"
      ? user.user_metadata.username
      : null) ||
    user?.email;

  const familyRole = user ? getFamilyRoleFromUser(user) : null;

  function startLesson(unit: number, lesson: number) {
    const key = `${unit}-${lesson}`;
    const data = LESSONS[key];
    if (!data) {
      showToast(ui.home.lessonComing);
      return;
    }
    setLessonComplete(null);
    setLessonState({
      key,
      data,
      screen: 0,
      xp: 0,
      hearts: 5,
      correct: 0,
      total: 0,
      wbPlaced: [],
      wbAnswer: [],
      micState: 0,
      audioTimers: {},
    });
    setView("lesson");
  }

  function exitLesson() {
    setView("home");
    setLessonState(null);
    setLessonComplete(null);
  }

  if (!supabase) {
    return (
      <div className={`flex flex-col items-center justify-center px-4 py-12 ${pageBg}`}>
        <div className={`${card} max-w-md text-center`}>
          <h1 className="text-lg font-bold text-[#58cc02]">{ui.config.title}</h1>
          <p className={`mt-2 text-sm ${muted}`}>{ui.config.hint}</p>
        </div>
      </div>
    );
  }

  if (booting) {
    return (
      <div className={`flex items-center justify-center text-sm text-neutral-500 ${pageBg}`}>
        {ui.boot.signingIn}
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`flex flex-col items-center justify-center px-4 py-10 ${pageBg}`}>
        <div className="flex w-full max-w-[400px] flex-col items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#58cc02]/15 text-3xl shadow-inner">
              🇵🇰
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#58cc02]">
              {ui.appName}
            </span>
          </div>
          <div className={`w-full ${card} p-7`}>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {ui.auth.welcomeTitle}
            </h2>
            <p className={`mt-1 text-sm ${muted}`}>
              {authMode === "signin"
                ? ui.auth.welcomeSub
                : ui.auth.welcomeSubRegister}
            </p>
            <div
              className="mt-4 flex rounded-xl border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-600 dark:bg-neutral-800/80"
              role="tablist"
            >
              <button
                type="button"
                role="tab"
                aria-selected={authMode === "signin"}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                  authMode === "signin"
                    ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-neutral-100"
                    : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                }`}
                onClick={() => {
                  setAuthMode("signin");
                  setAuthError("");
                  setAuthSuccess("");
                }}
              >
                {ui.auth.signIn}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === "register"}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                  authMode === "register"
                    ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-neutral-100"
                    : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                }`}
                onClick={() => {
                  setAuthMode("register");
                  setAuthError("");
                  setAuthSuccess("");
                }}
              >
                {ui.auth.createAccount}
              </button>
            </div>
            {authMode === "signin" ? (
              <p className={`mt-3 text-center text-xs leading-snug ${muted}`}>
                {ui.auth.forgotPasswordHint}
              </p>
            ) : null}
            <div className="mt-5 flex flex-col gap-1">
            {authError ? (
              <div className="mb-4 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
                {authError}
              </div>
            ) : null}
            {authSuccess ? (
              <div className="mb-4 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                {authSuccess}
              </div>
            ) : null}
              <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                {ui.auth.username}
              </label>
              <input
                className="mb-3 w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[15px] outline-none ring-[#58cc02]/30 focus:border-[#58cc02] focus:ring-2 dark:border-neutral-600 dark:bg-neutral-950"
                type="text"
                autoComplete="username"
                placeholder={
                  authMode === "register"
                    ? ui.auth.placeholders.usernameRegister
                    : ui.auth.placeholders.usernameSignIn
                }
                value={signInUsername}
                onChange={(e) => setSignInUsername(e.target.value)}
              />
              <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                {ui.auth.password}
              </label>
              <input
                className="mb-4 w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[15px] outline-none ring-[#58cc02]/30 focus:border-[#58cc02] focus:ring-2 dark:border-neutral-600 dark:bg-neutral-950"
                type="password"
                autoComplete={
                  authMode === "register" ? "new-password" : "current-password"
                }
                placeholder={ui.auth.placeholders.password}
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
              />
              {authMode === "signin" ? (
                <button
                  type="button"
                  className={primaryBtn}
                  onClick={handleSignIn}
                >
                  {ui.auth.signIn}
                </button>
              ) : (
                <button
                  type="button"
                  className={primaryBtn}
                  onClick={handleRegister}
                >
                  {ui.auth.createAccount}
                </button>
              )}
              <div className="mt-4 border-t border-neutral-200 pt-4 text-center text-sm dark:border-neutral-700">
                {authMode === "signin" ? (
                  <p className={muted}>
                    {ui.auth.newHere}{" "}
                    <button
                      type="button"
                      className="font-semibold text-[#46a302] underline decoration-[#58cc02]/60 underline-offset-2 hover:text-[#58cc02]"
                      onClick={() => {
                        setAuthMode("register");
                        setAuthError("");
                        setAuthSuccess("");
                      }}
                    >
                      {ui.auth.createAccountLink}
                    </button>
                  </p>
                ) : (
                  <p className={muted}>
                    {ui.auth.alreadyHave}{" "}
                    <button
                      type="button"
                      className="font-semibold text-[#46a302] underline decoration-[#58cc02]/60 underline-offset-2 hover:text-[#58cc02]"
                      onClick={() => {
                        setAuthMode("signin");
                        setAuthError("");
                        setAuthSuccess("");
                      }}
                    >
                      {ui.auth.signInInstead}
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen flex-col ${pageBg}`}>
      <header className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-neutral-200/90 bg-white px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#58cc02]/15 text-lg shadow-inner">
          🇵🇰
        </div>
        <span className="flex-1 text-lg font-bold tracking-tight text-[#58cc02]">
          {ui.appName}
        </span>
        {familyRole ? (
          <span
            className={`hidden max-w-[100px] truncate rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:inline ${
              familyRole === "student"
                ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200"
                : "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200"
            }`}
          >
            {familyRole === "student"
              ? ui.header.roleStudent
              : ui.header.roleParent}
          </span>
        ) : null}
        <span className="text-sm font-semibold text-orange-600">
          🔥 {progress.streak}
        </span>
        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
          ⚡ {progress.xp} XP
        </span>
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#58cc02] text-sm font-bold text-white"
            onClick={() => setProfileOpen((o) => !o)}
          >
            {displayName[0]?.toUpperCase() ?? "U"}
          </button>
          {profileOpen ? (
            <div
              className={`absolute right-0 top-12 z-[100] min-w-[180px] rounded-xl border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-900`}
            >
              <div
                className={`border-b border-neutral-200 px-3 py-2 text-xs dark:border-neutral-700`}
              >
                <div className={muted}>{profileIdentifier}</div>
                {familyRole ? (
                  <div className="mt-1 font-semibold text-[#58cc02]">
                    {familyRole === "student"
                      ? ui.header.roleStudent
                      : ui.header.roleParent}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                onClick={() => showToast(ui.header.profileSoon)}
              >
                {ui.header.profile}
              </button>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                onClick={() => showToast(ui.header.leaderboardSoon)}
              >
                {ui.header.leaderboard}
              </button>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                onClick={handleSignOut}
              >
                {ui.header.signOut}
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {view === "home" ? (
        <HomeBody
          displayName={displayName}
          familyRole={familyRole}
          progress={progress}
          onStartLesson={startLesson}
          onToast={showToast}
        />
      ) : lessonState && !lessonComplete ? (
        <LessonRunner
          lessonState={lessonState}
          setLessonState={setLessonState}
          onExit={exitLesson}
          onNext={advanceLesson}
        />
      ) : lessonComplete ? (
        <LessonCompleteView
          lesson={lessonComplete.lesson}
          runtime={lessonComplete.runtime}
          accuracy={lessonComplete.accuracy}
          streak={progress.streak}
          onHome={() => {
            exitLesson();
          }}
        />
      ) : null}

      <div
        className={`fixed bottom-6 left-1/2 z-[999] -translate-x-1/2 rounded-full bg-neutral-800 px-5 py-2.5 text-sm font-medium text-white transition-transform ${
          toast ? "translate-y-0" : "translate-y-24"
        }`}
      >
        {toast}
      </div>
    </div>
  );
}

function HomeBody({
  displayName,
  familyRole,
  progress,
  onStartLesson,
  onToast,
}: {
  displayName: string;
  familyRole: ReturnType<typeof getFamilyRoleFromUser>;
  progress: UserProgress;
  onStartLesson: (u: number, l: number) => void;
  onToast: (s: string) => void;
}) {
  const done = progress.completed["1-1"];
  const homeSubtitle =
    familyRole === "student"
      ? ui.family.homeSubtitleStudent
      : familyRole === "parent"
        ? ui.family.homeSubtitleParent
        : ui.family.homeSubtitleUnknown;
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {ui.home.greeting(displayName)}
        </h1>
        {familyRole ? (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${
              familyRole === "student"
                ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200"
                : "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200"
            }`}
          >
            {familyRole === "student"
              ? ui.header.roleStudent
              : ui.header.roleParent}
          </span>
        ) : null}
      </div>
      <p className={`mt-1 text-sm ${muted}`}>{homeSubtitle}</p>
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        {[
          { val: progress.streak, key: ui.home.streak },
          { val: progress.xp, key: ui.home.totalXp },
          { val: progress.lessons_done, key: ui.home.lessonsDone },
        ].map((s) => (
          <div
            key={s.key}
            className={`${card} px-3 py-4 text-center`}
          >
            <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              {s.val}
            </div>
            <div className={`mt-0.5 text-[11px] ${muted}`}>{s.key}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-[20px] bg-[#58cc02] px-5 py-4 text-white shadow-[0_4px_0_#46a302]">
        <span className="text-3xl">🗣️</span>
        <div>
          <h3 className="text-[15px] font-bold">{ui.home.phaseTitle}</h3>
          <p className="mt-0.5 text-xs opacity-90">{ui.home.phaseSub}</p>
        </div>
      </div>
      <p
        className={`mb-2 mt-6 text-xs font-semibold uppercase tracking-wider ${muted}`}
      >
        {ui.home.unit1}
      </p>
      <button
        type="button"
        className={`${card} mb-2.5 w-full cursor-pointer p-4 text-left transition hover:-translate-y-px hover:shadow-md active:translate-y-0`}
        onClick={() => onStartLesson(1, 1)}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#58cc02]/15 text-xl">
            🙏
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold">
              Lesson 1 — Introductions
            </div>
            <div className={`mt-0.5 text-xs ${muted}`}>
              Aap ka naam kya hai? · Mera naam … hai
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-[#58cc02]/15 px-2 py-0.5 text-[11px] font-semibold text-[#3d8c00] dark:text-[#58cc02]">
            {done ? ui.home.done : ui.home.start}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
          <div
            className="h-full rounded-full bg-[#58cc02] transition-all duration-500"
            style={{ width: done ? "100%" : "0%" }}
          />
        </div>
      </button>
      <div
        className={`${card} mb-2.5 cursor-not-allowed opacity-50`}
        aria-disabled
      >
        <div className="flex items-center gap-3 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xl dark:bg-neutral-800">
            🔒
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold">Lesson 2 — How are you?</div>
            <div className={`mt-0.5 text-xs ${muted}`}>
              Kya haal hai? · Main theek hun · Shukriya
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-400 dark:bg-neutral-800">
            {ui.home.locked}
          </span>
        </div>
      </div>
      <div className={`${card} mb-2.5 cursor-not-allowed opacity-50`}>
        <div className="flex items-center gap-3 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xl dark:bg-neutral-800">
            🔒
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold">Lesson 3 — Family words</div>
            <div className={`mt-0.5 text-xs ${muted}`}>
              Ammi · Abbu · Bhai · Behan
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-400 dark:bg-neutral-800">
            {ui.home.locked}
          </span>
        </div>
      </div>
      <p
        className={`mb-2 mt-8 text-xs font-semibold uppercase tracking-wider ${muted}`}
      >
        {ui.home.unit2}
      </p>
      <div className={`${card} cursor-not-allowed opacity-50`}>
        <div className="flex items-center gap-3 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xl dark:bg-neutral-800">
            🔒
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold">Lesson 1 — Numbers 1–10</div>
            <div className={`mt-0.5 text-xs ${muted}`}>
              Ek, Do, Teen… complete Phase 1 to unlock
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-400 dark:bg-neutral-800">
            {ui.home.locked}
          </span>
        </div>
      </div>
      {done ? (
        <p className={`mt-4 text-center text-xs ${muted}`}>
          <button
            type="button"
            className="font-medium text-[#58cc02] underline"
            onClick={() => onToast(ui.home.lessonComing)}
          >
            {ui.home.nextPreview}
          </button>
        </p>
      ) : null}
    </div>
  );
}

function LessonRunner({
  lessonState,
  setLessonState,
  onExit,
  onNext,
}: {
  lessonState: LessonRuntimeState;
  setLessonState: Dispatch<SetStateAction<LessonRuntimeState | null>>;
  onExit: () => void;
  onNext: () => void;
}) {
  const sc = lessonState.data.screens[lessonState.screen];
  const total = lessonState.data.screens.length;
  const pct = Math.round((lessonState.screen / total) * 100);

  if (!sc) return null;

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-4 pb-24">
      <div className="mb-3 flex items-center gap-2.5">
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          onClick={onExit}
          aria-label={ui.lesson.back}
        >
          ←
        </button>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          <div
            className="h-full rounded-full bg-[#58cc02] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-sm text-red-500">
          {formatHearts(lessonState.hearts)}
        </span>
        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
          +{lessonState.xp} XP
        </span>
      </div>
      <div className="mb-3 flex justify-center gap-1">
        {lessonState.data.screens.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all ${
              i < lessonState.screen
                ? "w-2 bg-[#58cc02]"
                : i === lessonState.screen
                  ? "w-5 bg-[#58cc02]"
                  : "w-2 border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800"
            }`}
          />
        ))}
      </div>
      <LessonScreenView
        key={`${lessonState.key}-${lessonState.screen}`}
        sc={sc}
        setLessonState={setLessonState}
        onNext={onNext}
      />
    </div>
  );
}

function LessonScreenView({
  sc,
  setLessonState,
  onNext,
}: {
  sc: LessonScreen;
  setLessonState: Dispatch<SetStateAction<LessonRuntimeState | null>>;
  onNext: () => void;
}) {
  const [choiceLocked, setChoiceLocked] = useState(false);
  const [choiceSel, setChoiceSel] = useState<number | null>(null);
  const [wbFeedback, setWbFeedback] = useState<"none" | "ok" | "bad">("none");
  const [dlgReply, setDlgReply] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const [micStep, setMicStep] = useState(0);
  const [micScores, setMicScores] = useState<{
    acc: number;
    rhy: number;
    ov: number;
  } | null>(null);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [wbBank, setWbBank] = useState<{ word: string; id: number }[]>(() =>
    sc.type === "word-bank"
      ? shuffleInPlace(sc.tiles.map((word, id) => ({ word, id })))
      : [],
  );
  const [wbTarget, setWbTarget] = useState<{ word: string; id: number }[]>(
    [],
  );

  function playAudio(id: string) {
    if (timersRef.current[id]) return;
    setPlaying(id);
    timersRef.current[id] = setTimeout(() => {
      setPlaying(null);
      delete timersRef.current[id];
    }, 1800);
  }

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  function checkChoice(idx: number, correct: number) {
    if (choiceLocked) return;
    setChoiceLocked(true);
    setChoiceSel(idx);
    setLessonState((s) => {
      if (!s) return s;
      const next = { ...s, total: s.total + 1 };
      if (idx === correct) {
        return { ...next, xp: s.xp + 10, correct: s.correct + 1 };
      }
      return { ...next, hearts: Math.max(0, s.hearts - 1) };
    });
  }

  function checkDialogue(idx: number, correct: number) {
    if (choiceLocked) return;
    setChoiceLocked(true);
    setChoiceSel(idx);
    if (idx === correct) setDlgReply(true);
    setLessonState((s) => {
      if (!s) return s;
      const next = { ...s, total: s.total + 1 };
      if (idx === correct) {
        return { ...next, xp: s.xp + 10, correct: s.correct + 1 };
      }
      return { ...next, hearts: Math.max(0, s.hearts - 1) };
    });
  }

  function addWbTile(word: string, id: number) {
    if (wbTarget.some((t) => t.id === id)) return;
    setWbTarget((t) => [...t, { word, id }]);
  }

  function removeWbAt(index: number) {
    setWbTarget((t) => t.filter((_, i) => i !== index));
  }

  function checkWordBank(answer: string[]) {
    const placed = wbTarget.map((t) => t.word);
    if (JSON.stringify(placed) === JSON.stringify(answer)) {
      setWbFeedback("ok");
      setLessonState((prev) =>
        prev
          ? {
              ...prev,
              xp: prev.xp + 15,
              correct: prev.correct + 1,
              total: prev.total + 1,
            }
          : prev,
      );
    } else if (placed.length === 0) {
      setWbFeedback("bad");
    } else {
      setWbFeedback("bad");
      setLessonState((prev) =>
        prev
          ? {
              ...prev,
              hearts: Math.max(0, prev.hearts - 1),
              total: prev.total + 1,
            }
          : prev,
      );
    }
  }

  function resetWb(tiles: string[], answer: string[]) {
    setWbBank(shuffleInPlace(tiles.map((word, id) => ({ word, id }))));
    setWbTarget([]);
    setWbFeedback("none");
    setLessonState((prev) => (prev ? { ...prev, wbAnswer: answer } : prev));
  }

  function runMic() {
    if (micStep !== 0) return;
    setMicStep(1);
    window.setTimeout(() => {
      setMicStep(2);
      window.setTimeout(() => {
        const acc = Math.round(78 + Math.random() * 18);
        const rhy = Math.round(72 + Math.random() * 22);
        const ov = Math.round((acc + rhy) / 2);
        setMicScores({ acc, rhy, ov });
        setMicStep(3);
        setLessonState((prev) =>
          prev
            ? {
                ...prev,
                xp: prev.xp + 20,
                correct: prev.correct + 1,
                total: prev.total + 1,
              }
            : prev,
        );
      }, 900);
    }, 2200);
  }

  if (sc.type === "intro") {
    return (
      <>
        <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          {ui.lesson.listenLearn}
        </p>
        <div className={`${card} mb-3 text-center`}>
          <div className={`text-xs ${muted}`}>{ui.lesson.newPhrase}</div>
          <div className="my-2 text-4xl font-bold text-neutral-900 dark:text-neutral-100">
            {sc.urdu}
          </div>
          <div className="text-xl font-semibold text-[#58cc02]">{sc.roman}</div>
          <div className={`mt-1 text-sm ${muted}`}>{sc.eng}</div>
          <button
            type="button"
            className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-3 text-sm font-semibold text-[#2e7d32] hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 ${
              playing === "abtn" ? "bg-[#58cc02] text-white" : ""
            }`}
            onClick={() => playAudio("abtn")}
          >
            {playing === "abtn" ? <AudioWave /> : <span>▶</span>}{" "}
            {ui.lesson.hearPronunciation}
          </button>
        </div>
        <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs leading-relaxed text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
          {sc.tip}
        </div>
        <button type="button" className={primaryBtn} onClick={onNext}>
          {ui.lesson.continue}
        </button>
      </>
    );
  }

  if (sc.type === "listen-choose" || sc.type === "translate") {
    const correct = sc.correct;
    const ok = choiceLocked && choiceSel === correct;
    return (
      <>
        <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          {sc.type === "translate"
            ? ui.lesson.translateUrdu
            : ui.lesson.listenChoose}
        </p>
        <div className={`${card} mb-3 text-center`}>
          {sc.type === "translate" ? (
            <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              {sc.prompt}
            </div>
          ) : (
            <>
              <div className={`text-xs ${muted}`}>{sc.prompt}</div>
              <div className="mt-2 text-lg font-semibold text-[#58cc02]">
                {sc.roman}
              </div>
              <button
                type="button"
                className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-sm font-semibold text-[#2e7d32] dark:border-emerald-800 dark:bg-emerald-950/40 ${
                  playing === "abtn" ? "bg-[#58cc02] text-white" : ""
                }`}
                onClick={() => playAudio("abtn")}
              >
                {playing === "abtn" ? <AudioWave /> : <span>▶</span>}{" "}
                {ui.lesson.playIt}
              </button>
            </>
          )}
        </div>
        <div className="mb-3 flex flex-col gap-2">
          {sc.choices.map((c, i) => (
            <button
              key={i}
              type="button"
              disabled={choiceLocked}
              className={`flex w-full items-center gap-2.5 rounded-xl border-2 px-4 py-3.5 text-left text-[15px] transition ${
                choiceLocked && i === correct
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40"
                  : choiceLocked && i === choiceSel && i !== correct
                    ? "border-red-500 bg-red-50 text-red-900 dark:bg-red-950/40"
                    : "border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
              } ${choiceLocked ? "cursor-default" : ""}`}
              onClick={() => checkChoice(i, correct)}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  choiceLocked && i === correct
                    ? "bg-emerald-500 text-white"
                    : choiceLocked && i === choiceSel && i !== correct
                      ? "bg-red-500 text-white"
                      : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"
                }`}
              >
                {choiceLetter(i)}
              </span>
              {c}
            </button>
          ))}
        </div>
        {choiceLocked ? (
          <div
            className={`mb-3 flex items-start gap-3 rounded-xl px-3 py-3.5 text-sm ${
              ok
                ? "border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
                : "border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
            }`}
          >
            <span className="text-xl">{ok ? "✅" : "❌"}</span>
            <div>
              <div className="font-semibold">
                {ok ? ui.lesson.correctXp(10) : ui.lesson.notQuite}
              </div>
              <div className={`mt-0.5 text-xs ${muted}`}>
                {ok
                  ? sc.feedback || ui.lesson.wellDoneFallback
                  : ui.lesson.correctAnswerAbove}
              </div>
            </div>
          </div>
        ) : null}
        <button
          type="button"
          className={primaryBtn}
          disabled={!choiceLocked}
          onClick={onNext}
        >
          {ui.lesson.continue}
        </button>
      </>
    );
  }

  if (sc.type === "word-bank") {
    const answer = sc.answer;
    const doneOk = wbFeedback === "ok";
    return (
      <>
        <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          {ui.lesson.buildSentence}
        </p>
        <div className={`${card} mb-2 p-4`}>
          <div className={`text-xs ${muted}`}>{ui.lesson.arrangeWords}</div>
          <div className="mt-2 text-lg font-bold text-neutral-900 dark:text-neutral-100">
            {sc.prompt.replace("Arrange the words: ", "")}
          </div>
        </div>
        <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
          {sc.tip}
        </div>
        <div
          className="mb-3 flex min-h-[52px] flex-wrap gap-1.5 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-100/80 p-2.5 dark:border-neutral-700 dark:bg-neutral-900/50"
          onKeyDown={() => {}}
        >
          {wbTarget.map((t, idx) => (
            <button
              key={`${t.id}-${idx}`}
              type="button"
              className="rounded-lg border border-emerald-400 bg-emerald-50 px-3.5 py-2 text-sm font-medium text-emerald-900 dark:bg-emerald-950/40"
              onClick={() => removeWbAt(idx)}
            >
              {t.word}
            </button>
          ))}
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {wbBank.map((b) => {
            const used = wbTarget.some((t) => t.id === b.id);
            return (
              <button
                key={b.id}
                type="button"
                disabled={used || doneOk}
                className={`rounded-lg border px-3.5 py-2 text-sm ${
                  used
                    ? "cursor-default opacity-30"
                    : "border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900"
                }`}
                onClick={() => addWbTile(b.word, b.id)}
              >
                {b.word}
              </button>
            );
          })}
        </div>
        {wbFeedback === "bad" ? (
          <div className="mb-3 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3.5 dark:border-red-900 dark:bg-red-950/30">
            <span className="text-xl">❌</span>
            <div className="text-sm">
              <div className="font-semibold">{ui.lesson.notQuite}</div>
              <div className={`mt-0.5 text-xs ${muted}`}>
                {ui.lesson.wordBankWrong}
              </div>
            </div>
          </div>
        ) : null}
        {doneOk ? (
          <div className="mb-3 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3.5 dark:border-emerald-800 dark:bg-emerald-950/30">
            <span className="text-xl">✅</span>
            <div className="text-sm">
              <div className="font-semibold">{ui.lesson.perfectXp(15)}</div>
              <div className={`mt-0.5 text-xs ${muted}`}>
                {ui.lesson.wordBankPerfect}
              </div>
            </div>
          </div>
        ) : null}
        <button
          type="button"
          className={primaryBtn}
          onClick={() => {
            if (doneOk) onNext();
            else checkWordBank(answer);
          }}
        >
          {doneOk ? ui.lesson.continue : ui.lesson.check}
        </button>
        {wbFeedback === "bad" && !doneOk ? (
          <button
            type="button"
            className="mt-2 w-full rounded-2xl border border-neutral-200 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            onClick={() => resetWb(sc.tiles, answer)}
          >
            {ui.lesson.tryAgain}
          </button>
        ) : null}
      </>
    );
  }

  if (sc.type === "speak") {
    return (
      <>
        <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          {ui.lesson.pronounce}
        </p>
        <div className={`${card} mb-4 p-4`}>
          <div className={`text-xs ${muted}`}>{ui.lesson.sayAloud}</div>
          <div className="mt-2 text-2xl font-semibold text-[#58cc02]">
            {sc.roman}
          </div>
          <div className={`mt-1 text-sm ${muted}`}>{sc.eng}</div>
        </div>
        <div className="py-6 text-center">
          <button
            type="button"
            className={`mx-auto mb-4 flex h-[90px] w-[90px] items-center justify-center rounded-full border-4 text-3xl transition ${
              micStep === 1
                ? "animate-pulse border-red-400 bg-red-50"
                : micStep >= 2
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-neutral-200 bg-neutral-100 dark:border-neutral-700"
            }`}
            onClick={runMic}
            disabled={micStep !== 0 && micStep < 3}
          >
            {micStep === 1 ? "⏹" : micStep >= 2 ? "✓" : "🎤"}
          </button>
          <div className={`text-sm ${muted}`}>
            {micStep === 0
              ? ui.lesson.tapMic
              : micStep === 1
                ? ui.lesson.listening
                : micStep === 2
                  ? ui.lesson.analysing
                  : ui.lesson.scoreTitle}
          </div>
          {micStep >= 3 ? (
            <>
              <p className="mt-2 min-h-[24px] text-[15px] font-semibold text-neutral-900 dark:text-neutral-100">
                {ui.lesson.youSaid}
              </p>
              {micScores ? (
                <div className="mx-auto mt-3 max-w-xs space-y-2 text-xs">
                  {[
                    [ui.lesson.micAccuracy, micScores.acc, "bg-emerald-500"],
                    [ui.lesson.micRhythm, micScores.rhy, "bg-orange-400"],
                    [ui.lesson.micOverall, micScores.ov, "bg-emerald-500"],
                  ].map(([label, val, col]) => (
                    <div key={label as string} className="flex items-center gap-2">
                      <span className={`w-16 text-right ${muted}`}>{label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                        <div
                          className={`h-full rounded-full ${col}`}
                          style={{ width: `${val}%` }}
                        />
                      </div>
                      <span className={muted}>{val}%</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
        {micStep >= 3 && micScores ? (
          <div className="mb-3 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3.5 dark:border-emerald-800 dark:bg-emerald-950/30">
            <span className="text-xl">✅</span>
            <div className="text-sm">
              <div className="font-semibold">
                {micScores.ov >= 80 ? ui.lesson.micGreat : ui.lesson.micGood}
              </div>
              <div className={`mt-0.5 text-xs ${muted}`}>
                {ui.lesson.micFocus}
              </div>
            </div>
          </div>
        ) : null}
        <button
          type="button"
          className={primaryBtn}
          disabled={micStep < 3}
          onClick={onNext}
        >
          {ui.lesson.continue}
        </button>
      </>
    );
  }

  if (sc.type === "intro-pair") {
    return (
      <>
        <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          {ui.lesson.twoPhrases}
        </p>
        <div className={`${card} mb-3`}>
          <div className={`text-xs ${muted}`}>{ui.lesson.essentialGreetings}</div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {sc.pairs.map((p, i) => (
              <div
                key={i}
                className="rounded-xl bg-neutral-100 px-2 py-3 text-center dark:bg-neutral-800"
              >
                <div className="text-base font-bold text-[#58cc02]">{p.roman}</div>
                <div className={`mt-0.5 text-[11px] ${muted}`}>{p.eng}</div>
                <div className="mt-0.5 text-[11px] text-neutral-400">
                  ({p.note})
                </div>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs font-semibold text-[#58cc02] dark:border-emerald-800 dark:bg-neutral-900"
                  onClick={() => playAudio(`ap${i}`)}
                >
                  {playing === `ap${i}` ? <AudioWave /> : <span>▶</span>}{" "}
                  {ui.lesson.hear}
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
          {sc.tip}
        </div>
        <button type="button" className={primaryBtn} onClick={onNext}>
          {ui.lesson.gotIt}
        </button>
      </>
    );
  }

  if (sc.type === "dialogue") {
    const correct = sc.correct;
    const ok = choiceLocked && choiceSel === correct;
    return (
      <>
        <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          {ui.lesson.roleplay}
        </p>
        <div className="mb-3 rounded-xl bg-neutral-100 p-4 dark:bg-neutral-900">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-200">
              A
            </div>
            <span className={`text-xs font-semibold ${muted}`}>
              {ui.lesson.nativeSpeaker(sc.speaker)}
            </span>
          </div>
          <div className={`${card} p-3`}>
            <div className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100">
              {sc.line_roman}
            </div>
            <div className="mt-1 text-lg text-[#58cc02]">{sc.line_urdu}</div>
            <div className={`mt-1 text-xs ${muted}`}>{sc.line_eng}</div>
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#58cc02]"
              onClick={() => playAudio("dl1")}
            >
              {playing === "dl1" ? <AudioWave /> : <span>▶</span>}{" "}
              {ui.lesson.play}
            </button>
          </div>
        </div>
        <div
          className={`mb-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200`}
        >
          {dlgReply ? ui.lesson.ahmedReplies : ui.lesson.yourTurn}
        </div>
        <div className="mb-3 flex flex-col gap-2">
          {sc.choices.map((c, i) => (
            <button
              key={i}
              type="button"
              disabled={choiceLocked}
              className={`flex w-full items-center gap-2.5 rounded-xl border-2 px-4 py-3.5 text-left text-sm transition ${
                choiceLocked && i === correct
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
                  : choiceLocked && choiceSel === i && i !== correct
                    ? "border-red-500 bg-red-50 dark:bg-red-950/40"
                    : "border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900"
              }`}
              onClick={() => checkDialogue(i, correct)}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  choiceLocked && i === correct
                    ? "bg-emerald-500 text-white"
                    : choiceLocked && choiceSel === i && i !== correct
                      ? "bg-red-500 text-white"
                      : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"
                }`}
              >
                {choiceLetter(i)}
              </span>
              {c}
            </button>
          ))}
        </div>
        {dlgReply ? (
          <div className="mb-3 rounded-xl bg-neutral-100 p-4 dark:bg-neutral-900">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                A
              </div>
              <span className={`text-xs font-semibold ${muted}`}>{sc.speaker}</span>
            </div>
            <div className={`${card} p-3`}>
              <div className="text-[15px] font-semibold">{sc.reply_roman}</div>
              <div className="mt-1 text-lg text-[#58cc02]">{sc.reply_urdu}</div>
              <div className={`mt-1 text-xs ${muted}`}>{sc.reply_eng}</div>
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#58cc02]"
                onClick={() => playAudio("dl2")}
              >
                {playing === "dl2" ? <AudioWave /> : <span>▶</span>}{" "}
                {ui.lesson.play}
              </button>
            </div>
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              {sc.tip}
            </div>
          </div>
        ) : null}
        {choiceLocked ? (
          <div
            className={`mb-3 flex items-start gap-3 rounded-xl px-3 py-3.5 text-sm ${
              ok
                ? "border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
                : "border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
            }`}
          >
            <span className="text-xl">{ok ? "✅" : "❌"}</span>
            <div>
              <div className="font-semibold">
                {ok ? ui.lesson.perfectXp(10) : ui.lesson.notQuite}
              </div>
              <div className={`mt-0.5 text-xs ${muted}`}>
                {ok ? ui.lesson.dialoguePerfect : ui.lesson.dialogueWrong}
              </div>
            </div>
          </div>
        ) : null}
        <button
          type="button"
          className={primaryBtn}
          disabled={!choiceLocked}
          onClick={onNext}
        >
          {ui.lesson.continue}
        </button>
      </>
    );
  }

  return null;
}

function LessonCompleteView({
  lesson,
  runtime,
  accuracy,
  streak,
  onHome,
}: {
  lesson: LessonDefinition;
  runtime: LessonRuntimeState;
  accuracy: number;
  streak: number;
  onHome: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 text-center">
      <div className="text-6xl">⭐</div>
      <h2 className="mt-4 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
        {ui.lesson.lessonComplete}
      </h2>
      <p className={`mt-1 text-sm ${muted}`}>{ui.lesson.shabash}</p>
      <div className="mt-6 grid grid-cols-3 gap-2.5">
        <div className="rounded-xl bg-neutral-100 px-2 py-3 dark:bg-neutral-900">
          <div className="text-xl font-bold">+{runtime.xp}</div>
          <div className={`text-[11px] ${muted}`}>{ui.lesson.xpEarned}</div>
        </div>
        <div className="rounded-xl bg-neutral-100 px-2 py-3 dark:bg-neutral-900">
          <div className="text-xl font-bold">{accuracy}%</div>
          <div className={`text-[11px] ${muted}`}>{ui.lesson.accuracy}</div>
        </div>
        <div className="rounded-xl bg-neutral-100 px-2 py-3 dark:bg-neutral-900">
          <div className="text-xl font-bold">🔥 {streak}</div>
          <div className={`text-[11px] ${muted}`}>{ui.lesson.dayStreak}</div>
        </div>
      </div>
      <div className={`${card} mt-5 p-4 text-left`}>
        <div className={`text-[11px] font-bold uppercase tracking-wider ${muted}`}>
          {ui.lesson.wordsPractised}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {lesson.words.map((w, i) => (
            <div key={i}>
              <div className="text-[13px] font-semibold">{w.roman}</div>
              <div className={`text-[11px] ${muted}`}>{w.eng}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left dark:border-emerald-800 dark:bg-emerald-950/40">
        <div className="text-[11px] font-bold text-[#2e7d32] dark:text-emerald-400">
          {ui.lesson.cultureNote}
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-emerald-900 dark:text-emerald-200">
          {lesson.culture}
        </p>
      </div>
      <button type="button" className={`${primaryBtn} mt-6`} onClick={onHome}>
        {ui.lesson.backHome}
      </button>
    </div>
  );
}
