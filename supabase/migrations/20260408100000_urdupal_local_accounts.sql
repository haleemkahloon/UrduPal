-- Username + password only (no Supabase Auth email). Progress.user_id references this table.

create table if not exists public.urdupal_local_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  constraint urdupal_local_username_nonempty check (char_length(trim(username)) >= 1)
);

create unique index if not exists urdupal_local_accounts_username_lower_idx
  on public.urdupal_local_accounts (lower(trim(username)));

-- Repoint lesson progress to local accounts (clears rows linked to old Auth users)
do $$
declare
  r record;
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'urdupal_progress'
  ) then
    truncate table public.urdupal_progress;
    for r in
      select c.conname as cn
      from pg_constraint c
      join pg_class t on c.conrelid = t.oid
      where t.relname = 'urdupal_progress'
        and c.contype = 'f'
    loop
      execute format('alter table public.urdupal_progress drop constraint %I', r.cn);
    end loop;
    alter table public.urdupal_progress
      add constraint urdupal_progress_user_id_fkey
      foreign key (user_id) references public.urdupal_local_accounts (id) on delete cascade;
  else
    create table public.urdupal_progress (
      user_id uuid primary key references public.urdupal_local_accounts (id) on delete cascade,
      xp int not null default 0,
      streak int not null default 0,
      lessons_done int not null default 0,
      completed jsonb not null default '{}'::jsonb,
      updated_at timestamptz
    );
  end if;
end $$;
