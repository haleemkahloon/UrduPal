# UrduPal

Next.js app for learning Urdu: lessons, streaks, XP, and progress stored in **Supabase**.

## Requirements

- Node.js 20+
- A [Supabase](https://supabase.com) project (Auth + `urdupal_progress` table)

### Supabase schema (usernames + progress)

1. Open **SQL Editor** in the Supabase dashboard.
2. Paste and run the migration file **`supabase/migrations/20260407120000_urdupal_app_users.sql`**. That creates **`urdupal_app_users`** (one row per login), an RPC to check if a username is free, and a trigger so new sign-ups are stored immediately.
3. For **username-only** sign-up with instant login: **Authentication → Providers → Email** → turn **Confirm email** **off** (passwords still live in Auth only; the app never stores passwords in your tables).
4. To **wipe all logins and progress**, run **`supabase/sql/reset_urdupal_users_and_auth.sql`** once (destructive).

## Local development

```bash
npm install
```

Create `.env.local` in the project root (never commit this file):

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
| `NEXT_PUBLIC_AUTH_EMAIL_DOMAIN` | Optional. If users type a **short name** (no `@`), it becomes `name@DOMAIN`. Defaults to **`gmail.com`** in code if unset. Set this to match your Supabase Auth emails (e.g. `outlook.com`, `yahoo.com`, or your own domain). If accounts use **mixed** domains, sign in with the **full email** each time. |

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
