-- =============================================================================
-- AI Compass — cloud sign-in schema
-- =============================================================================
-- Run this ONCE, MANUALLY, in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste → Run).
--
-- It sets up the single table used by the optional magic-link sign-in feature
-- so a signed-in user's prompt history can follow them across devices, plus the
-- Row Level Security (RLS) policies that make the client-side publishable key
-- safe: every user can only ever read or write their OWN rows.
--
-- You do NOT need this to use AI Compass — the app works fully local-only when
-- no Supabase project is configured. This is only for the sync-across-devices
-- enhancement.
--
-- Safe to re-run: guarded with IF NOT EXISTS / DROP POLICY IF EXISTS.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Table: prompt_history
-- ---------------------------------------------------------------------------
create table if not exists public.prompt_history (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  text       text not null,
  tokens     integer not null,
  cost       numeric,
  created_at timestamptz not null default now()
);

-- Helpful index for the common "my history, newest first" query.
create index if not exists prompt_history_user_id_created_at_idx
  on public.prompt_history (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.prompt_history enable row level security;

-- A user may SELECT only their own rows.
drop policy if exists "prompt_history_select_own" on public.prompt_history;
create policy "prompt_history_select_own"
  on public.prompt_history
  for select
  using (user_id = auth.uid());

-- A user may INSERT only rows owned by themselves.
drop policy if exists "prompt_history_insert_own" on public.prompt_history;
create policy "prompt_history_insert_own"
  on public.prompt_history
  for insert
  with check (user_id = auth.uid());

-- A user may UPDATE only their own rows (and can't reassign them to someone else).
drop policy if exists "prompt_history_update_own" on public.prompt_history;
create policy "prompt_history_update_own"
  on public.prompt_history
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- A user may DELETE only their own rows.
drop policy if exists "prompt_history_delete_own" on public.prompt_history;
create policy "prompt_history_delete_own"
  on public.prompt_history
  for delete
  using (user_id = auth.uid());
