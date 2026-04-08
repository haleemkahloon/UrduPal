# UrduPal

Next.js app for learning Urdu: lessons, streaks, XP, and progress stored in **Supabase**.

## Requirements

- Node.js 20+
- A [Supabase](https://supabase.com) project (Auth + `urdupal_progress` table)

### Where the SQL files live (in this repo)

Everything is under the project root folder `urdupal-app/` (or whatever you named the clone).

| What | Path from project root | What it does |
|------|------------------------|--------------|
| **Main migration (run first)** | `supabase/migrations/20260407120000_urdupal_app_users.sql` | Creates `urdupal_app_users`, RLS policies, `urdupal_auth_email_available()`, and the `auth.users` trigger. |
| **Nuclear reset (optional)** | `supabase/sql/reset_urdupal_users_and_auth.sql` | Deletes **all** Auth users + clears `urdupal_app_users` + truncates `urdupal_progress`. **Irreversible.** |

On your Mac, if the project is at `/Users/haleemmasood/urdupal-app`, the migration file is:

`/Users/haleemmasood/urdupal-app/supabase/migrations/20260407120000_urdupal_app_users.sql`

Open it in your editor, **Select All**, copy, then paste into Supabase (steps below).

---

### Step-by-step checklist (Supabase + app)

Do these **in order** the first time you set up or after you pull new code.

#### A. Run the migration (creates tables + trigger + RPC)

1. On your machine, open the file **`supabase/migrations/20260407120000_urdupal_app_users.sql`** in Cursor/VS Code (or any editor).
2. Select the **entire** contents (`Cmd+A`), copy (`Cmd+C`).
3. In the browser, open [Supabase](https://supabase.com) → your project.
4. Left sidebar → **SQL Editor**.
5. Click **New query** (or use a blank query tab).
6. Paste the SQL (`Cmd+V`).
7. Click **Run** (or press the keyboard shortcut shown in the UI).
8. Confirm you see **Success** with no red errors. If something already exists from a partial run, read the error text; you may need to fix duplicates in the dashboard or ask for help with the exact message.

#### B. Allow instant sign-up / sign-in (no email inbox)

The app stores Auth as **email + password** internally, but you only type a **username**. It becomes a synthetic address like `username@urdupal.invalid` (RFC-reserved; not real mail). Avoid setting the domain to `gmail.com` — Supabase often rejects that as invalid for fake accounts. If Supabase requires **email confirmation**, turn it off for this flow.

1. Supabase dashboard → **Authentication** (left sidebar).
2. **Providers** → **Email**.
3. Turn **Confirm email** **OFF** (disable).
4. Save if the UI asks you to.

If sign-up still says the password is too short: on the same **Email** provider screen, lower **Minimum password length** (Supabase enforces this server-side; the app does not block password length). Example **`abc123`** has 6 characters and matches the usual default of **6**.

#### C. Point Auth at your deployed app (production)

1. **Authentication** → **URL configuration**.
2. **Site URL**: your live app URL, e.g. `https://urdupal-app.vercel.app`.
3. **Redirect URLs**: add the same base URL and/or `https://your-domain.vercel.app/**` so auth redirects work.

#### D. Environment variables (local + Vercel)

1. In Supabase: **Project Settings** (gear) → **API**.
2. Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`.
3. Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Local: put them in **`.env.local`** at the project root (same folder as `package.json`). Never commit `.env.local`.
5. Vercel: **Project → Settings → Environment Variables** → add the same names for **Production** (and Preview if you use it) → **Redeploy** after saving.

Optional: `NEXT_PUBLIC_AUTH_EMAIL_DOMAIN` — only if you want synthetic emails to use a domain other than the default (`urdupal.invalid` in code). Must stay consistent or existing users cannot sign in. Do not use `gmail.com` unless you use real Gmail addresses.

#### E. (Optional) Wipe every user and start clean

Only if you really want **zero** accounts and **no** lesson progress.

1. Open **`supabase/sql/reset_urdupal_users_and_auth.sql`** locally, copy **all** SQL.
2. Supabase → **SQL Editor** → new query → paste → **Run**.
3. If `truncate` fails because `urdupal_progress` does not exist yet, create that table first or remove the `truncate` line and run again (or create the progress table from your earlier schema).

---

### Supabase schema (short summary)

- **`urdupal_app_users`** — one row per login; `username` for display; `user_id` links to `auth.users`.
- **`urdupal_progress`** — lesson XP / streak (separate table; must exist for the app to save progress).

## Local development

```bash
npm install
```

Create `.env.local` in the project root (never commit this file):

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
| `NEXT_PUBLIC_AUTH_EMAIL_DOMAIN` | Optional. Short name becomes `name@DOMAIN`. Default in code is **`urdupal.invalid`** (safe synthetic domain). Avoid **`gmail.com`** for username-only sign-up — Auth may reject it. |

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Vercel

1. Push this repo to GitHub.
2. Import the repo in [Vercel](https://vercel.com) (New Project → select repository).
3. Add the same environment variables as in `.env.local` under **Project → Settings → Environment Variables** (Production / Preview as needed).
4. Deploy. Vercel will assign a URL like `https://<project>.vercel.app`.

### Supabase after deploy

In Supabase: **Authentication → URL configuration**

- Set **Site URL** to your Vercel URL.
- Add your Vercel URL to **Redirect URLs** (e.g. `https://your-app.vercel.app/**`).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run production build locally |
| `npm run lint` | ESLint |

## Repository

**https://github.com/haleemkahloon/UrduPal**
