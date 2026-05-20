-- PR-FE-05 / migration 0023: per-user lesson completion.
-- lesson_id is a text slug (content lives in code/CMS, not a `lessons` table
-- with FK). Upsert semantics on (user_id, lesson_id).

create table if not exists public.lesson_progress (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  lesson_id    text not null,
  completed    boolean not null default false,
  completed_at timestamptz,
  updated_at   timestamptz not null default timezone('utc', now()),
  primary key (user_id, lesson_id),
  constraint lesson_progress_lesson_id_not_blank
    check (length(trim(lesson_id)) > 0)
);

create index if not exists lesson_progress_user_idx
  on public.lesson_progress (user_id, updated_at desc);

create trigger lesson_progress_set_updated_at
  before update on public.lesson_progress
  for each row execute function app_private.set_updated_at();

alter table public.lesson_progress enable row level security;

create policy "Owner can select on lesson_progress"
  on public.lesson_progress for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Owner can insert on lesson_progress"
  on public.lesson_progress for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Owner can update on lesson_progress"
  on public.lesson_progress for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Owner can delete on lesson_progress"
  on public.lesson_progress for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.lesson_progress to authenticated;
