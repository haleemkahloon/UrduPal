# UrduPal

Next.js app for learning Urdu: lessons, streaks, XP, and progress in **Supabase Postgres**.

**Login is username + password only** (no email). Accounts live in **`urdupal_local_accounts`**; passwords are bcrypt hashes. Sessions use a signed HTTP-only cookie (`AUTH_SECRET`). The **Supabase service role** is used only in **server** API routes — never expose it to the browser.

## Requirements

- Node.js 20+
- A [Supabase](https://supabase.com) project
- Environment variables below

### SQL migrations (run in Supabase → SQL Editor)

| File | Purpose |
|------|---------|
| **`supabase/migrations/20260408100000_urdupal_local_accounts.sql`** | **Use this.** Creates `urdupal_local_accounts` and links `urdupal_progress.user_id` to it (truncates old progress when switching from Auth). |
| `supabase/migrations/20260407120000_urdupal_app_users.sql` | **Legacy** (Supabase Auth + trigger). Skip if you only use username/password from the migration above. |

**Reset script:** `supabase/sql/reset_urdupal_users_and_auth.sql` — truncates progress and deletes local accounts.

---

## Environment variables

Create **`.env.local`** in the project root (never commit it).

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Project URL (Settings → API). |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | **Secret.** Server-only; used in `/api/*` to read/write Postgres. |
| `AUTH_SECRET` | Yes | At least **32 characters**; used to sign session cookies. Generate e.g. `openssl rand -base64 32`. |

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is **not** required for the current app (no browser Supabase client).

### Vercel

Add the same three variables for **Production**. Redeploy after changing env vars.

---

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## List registered users (SQL)

There is no Supabase Auth user row for local accounts. Query:

```sql
select id, username, created_at
from public.urdupal_local_accounts
order by created_at desc;
```

---

## Deploy on Vercel

1. Push this repo to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Set **Environment Variables** (see table above).
4. Deploy.

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run production build locally |
| `npm run lint` | ESLint |

## Repository

**https://github.com/haleemkahloon/UrduPal**
