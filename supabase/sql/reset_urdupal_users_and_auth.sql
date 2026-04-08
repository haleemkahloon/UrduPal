-- =============================================================================
-- DESTRUCTIVE: Deletes ALL Supabase Auth users and UrduPal rows in these tables.
-- Run once in Supabase → SQL Editor when you want a clean slate.
-- Progress and profiles are removed; you will need to re-register accounts.
-- =============================================================================

-- Lesson progress (create this table first if you use the app; see README)
truncate table public.urdupal_progress;

delete from public.urdupal_app_users;

-- Removes every login. Cascades to urdupal_app_users if you rely on FK only;
-- we delete app_users above so progress truncate + auth delete is explicit.
delete from auth.users;

-- If delete from auth.users fails (permissions), use the Dashboard:
-- Authentication → Users → delete users there, or use the Admin API.
