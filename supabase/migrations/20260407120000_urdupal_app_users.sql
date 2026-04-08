-- UrduPal: app user profiles (separate from auth; passwords stay in auth.users only).
-- Run via Supabase SQL Editor or `supabase db push` if you use the CLI.

-- ---------------------------------------------------------------------------
-- 1. Profile table (one row per auth user)
-- ---------------------------------------------------------------------------
create table if not exists public.urdupal_app_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint urdupal_app_users_username_nonempty check (char_length(trim(username)) >= 1)
);

create unique index if not exists urdupal_app_users_username_lower_idx
  on public.urdupal_app_users (lower(trim(username)));

alter table public.urdupal_app_users enable row level security;

create policy "urdupal_app_users_select_own"
  on public.urdupal_app_users for select
  to authenticated
  using (auth.uid() = user_id);

create policy "urdupal_app_users_insert_own"
  on public.urdupal_app_users for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "urdupal_app_users_update_own"
  on public.urdupal_app_users for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.urdupal_app_users to authenticated;

-- ---------------------------------------------------------------------------
-- 2. RPC: can this synthetic email be registered? (anon + authenticated)
-- ---------------------------------------------------------------------------
create or replace function public.urdupal_auth_email_available(p_email text)
returns boolean
language sql
stable
security definer
set search_path = auth
as $$
  select not exists (
    select 1
    from auth.users au
    where lower(au.email) = lower(trim(p_email))
  );
$$;

grant execute on function public.urdupal_auth_email_available(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. After each new auth user, mirror username into urdupal_app_users
-- ---------------------------------------------------------------------------
create or replace function public.urdupal_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  v_username := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );

  if v_username is null or v_username = '' then
    v_username := split_part(coalesce(new.email, ''), '@', 1);
  end if;

  insert into public.urdupal_app_users (user_id, username)
  values (new.id, v_username)
  on conflict (user_id) do update
    set username = excluded.username,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_urdupal_auth_user_created on auth.users;

create trigger on_urdupal_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.urdupal_handle_new_auth_user();

-- Existing Auth users (created before this migration) have no row until they
-- sign in again; you can backfill manually in SQL if needed.
