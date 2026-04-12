-- Clears lesson progress and username/password accounts (no Supabase Auth users).
-- Run in SQL Editor if you want a clean slate.

truncate table public.urdupal_progress;

delete from public.urdupal_local_accounts;
