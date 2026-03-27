-- Run this script in Supabase SQL Editor.
-- It creates app tables, RLS policies, an auto-profile trigger, and storage policies.

create extension if not exists pgcrypto;

-- Optional: create bucket from SQL (safe if already exists).
insert into storage.buckets (id, name, public)
values ('ner-uploads', 'ner-uploads', false)
on conflict (id) do nothing;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input_text text not null,
  output_tokens jsonb not null default '[]'::jsonb,
  source_file_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.uploaded_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null default 'ner-uploads',
  storage_path text not null,
  original_name text,
  mime_type text,
  prediction_id uuid references public.predictions(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_predictions_user_created
on public.predictions (user_id, created_at desc);

create index if not exists idx_uploaded_files_user_created
on public.uploaded_files (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.predictions enable row level security;
alter table public.uploaded_files enable row level security;

-- Profiles policies
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Predictions policies
drop policy if exists "predictions_select_own" on public.predictions;
create policy "predictions_select_own"
on public.predictions
for select
using (auth.uid() = user_id);

drop policy if exists "predictions_insert_own" on public.predictions;
create policy "predictions_insert_own"
on public.predictions
for insert
with check (auth.uid() = user_id);

drop policy if exists "predictions_delete_own" on public.predictions;
create policy "predictions_delete_own"
on public.predictions
for delete
using (auth.uid() = user_id);

-- Uploaded files policies
drop policy if exists "uploaded_files_select_own" on public.uploaded_files;
create policy "uploaded_files_select_own"
on public.uploaded_files
for select
using (auth.uid() = user_id);

drop policy if exists "uploaded_files_insert_own" on public.uploaded_files;
create policy "uploaded_files_insert_own"
on public.uploaded_files
for insert
with check (auth.uid() = user_id);

drop policy if exists "uploaded_files_delete_own" on public.uploaded_files;
create policy "uploaded_files_delete_own"
on public.uploaded_files
for delete
using (auth.uid() = user_id);

-- Auto-create profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Storage object policies for per-user folders: {user_id}/filename.txt
drop policy if exists "storage_upload_own_folder" on storage.objects;
create policy "storage_upload_own_folder"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'ner-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "storage_read_own_folder" on storage.objects;
create policy "storage_read_own_folder"
on storage.objects
for select to authenticated
using (
  bucket_id = 'ner-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "storage_delete_own_folder" on storage.objects;
create policy "storage_delete_own_folder"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'ner-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);
