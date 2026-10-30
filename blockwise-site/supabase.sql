-- Run this once in Supabase: SQL Editor > New query > paste > Run
create table public.projects (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null default 'Untitled project',
  data text,
  updated_at timestamptz not null default now()
);
create table public.workspaces (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('sand','learn')),
  data text,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind)
);
create index projects_user_idx on public.projects (user_id, updated_at desc);

-- Row Level Security: every user can only see and change their own rows
alter table public.projects enable row level security;
alter table public.workspaces enable row level security;
create policy "own projects" on public.projects for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own workspaces" on public.workspaces for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
