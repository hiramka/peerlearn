-- ============================================================================
-- PeerLearn v2 - Phase 1: Foundation Schema & Row-Level Security (RLS)
-- ============================================================================

-- Ensure pgcrypto is available for UUIDs
create extension if not exists "pgcrypto";

-- 1. Helper Functions for RLS
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
as $$
  select coalesce(
    (auth.jwt() ->> 'role' = 'platform_admin') or
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'platform_admin'),
    false
  );
$$;

-- 2. Core Tables

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  county text,
  school_code text unique not null,
  status text default 'sandbox' check (status in ('sandbox','pilot','active','paused')),
  pilot_started_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.school_applications (
  id uuid primary key default gen_random_uuid(),
  school_name text not null,
  county text,
  school_type text,
  contact_name text not null,
  contact_phone text not null,
  contact_email text not null,
  student_count int,
  grades int[],
  subjects text[],
  consent_given boolean default false,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  school_id uuid not null references public.schools on delete cascade,
  full_name text not null,
  reg_number text not null,
  grade int,
  class_stream text,
  language text default 'en',
  availability jsonb default '{}',
  is_demo boolean default false,
  guardian_consent_at timestamptz,
  created_at timestamptz default now(),
  unique (school_id, reg_number)
);

create table if not exists public.school_members (
  school_id uuid not null references public.schools on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  role text not null check (role in ('school_admin','teacher','tutor','learner')),
  status text default 'active' check (status in ('active','suspended','inactive')),
  primary key (school_id, user_id, role)
);

-- Service role only: holds student setup codes and lockouts (never exposed to clients)
create table if not exists public.student_credentials (
  user_id uuid primary key references public.profiles on delete cascade,
  school_id uuid not null references public.schools on delete cascade,
  setup_code_hash text not null,
  setup_used boolean default false,
  failed_attempts int default 0,
  locked_until timestamptz
);

create table if not exists public.topics (
  id serial primary key,
  subject text not null,
  name text not null,
  grade int not null
);

create table if not exists public.user_topics (
  user_id uuid not null references public.profiles on delete cascade,
  school_id uuid not null references public.schools on delete cascade,
  topic_id int not null references public.topics on delete cascade,
  level text check (level in ('strong','needs_help')),
  verified_score numeric default 0,
  teacher_approved boolean default false,
  primary key (user_id, topic_id)
);

create table if not exists public.questions (
  id serial primary key,
  school_id uuid references public.schools on delete cascade, -- null = platform global question
  topic_id int not null references public.topics on delete cascade,
  sub_skill text,
  difficulty int default 1,
  language text default 'en',
  body jsonb not null -- {q, options[], answer}
);

create table if not exists public.lessons (
  id serial primary key,
  school_id uuid references public.schools on delete cascade, -- null = platform global lesson
  topic_id int not null references public.topics on delete cascade,
  title text not null,
  tutor_guide jsonb default '[]',
  practice jsonb default '[]',
  version int default 1,
  status text default 'draft' check (status in ('draft','published','archived'))
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  learner_id uuid not null references public.profiles on delete cascade,
  tutor_id uuid not null references public.profiles on delete cascade,
  topic_id int not null references public.topics on delete cascade,
  score numeric not null default 0,
  why jsonb default '[]',
  status text default 'proposed' check (status in ('proposed','accepted','declined','scheduled','completed','cancelled')),
  scheduled_at timestamptz,
  location text,
  is_demo boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  match_id uuid references public.matches on delete set null,
  topic_id int not null references public.topics on delete cascade,
  pre_score numeric,
  post_score numeric,
  retention_score numeric,
  learner_rating int check (learner_rating between 1 and 5),
  rating_tags text[],
  client_id text unique not null, -- idempotency key from offline clients
  is_demo boolean default false,
  created_at timestamptz default now(),
  synced_at timestamptz default now()
);

create table if not exists public.session_events (
  id bigserial primary key,
  school_id uuid not null references public.schools on delete cascade,
  session_id uuid not null references public.sessions on delete cascade,
  type text not null, -- 'started', 'pre_quiz_done', 'step_checked', 'post_quiz_done', 'ended'
  payload jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  reporter_id uuid not null references public.profiles on delete cascade,
  match_id uuid references public.matches on delete set null,
  reason text not null,
  status text default 'open' check (status in ('open','in_review','resolved','dismissed')),
  created_at timestamptz default now()
);

create table if not exists public.audit_log (
  id bigserial primary key,
  school_id uuid references public.schools on delete cascade,
  actor_id uuid references public.profiles on delete set null,
  action text not null,
  detail jsonb default '{}',
  created_at timestamptz default now()
);

-- 3. Functions for Tenant Verification in RLS

create or replace function public.auth_school_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select school_id from public.school_members
  where user_id = auth.uid() and status = 'active';
$$;

create or replace function public.is_school_staff(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.school_members
    where school_id = p_school_id
      and user_id = auth.uid()
      and role in ('school_admin', 'teacher')
      and status = 'active'
  );
$$;

-- 4. Enable Row-Level Security on ALL tables

alter table public.schools enable row level security;
alter table public.school_applications enable row level security;
alter table public.profiles enable row level security;
alter table public.school_members enable row level security;
alter table public.student_credentials enable row level security;
alter table public.topics enable row level security;
alter table public.user_topics enable row level security;
alter table public.questions enable row level security;
alter table public.lessons enable row level security;
alter table public.matches enable row level security;
alter table public.sessions enable row level security;
alter table public.session_events enable row level security;
alter table public.reports enable row level security;
alter table public.audit_log enable row level security;

-- 5. RLS Policies

-- schools: Members can read their own school; platform admin can manage all
create policy "schools_select_member" on public.schools
  for select using (id in (select public.auth_school_ids()) or public.is_platform_admin());

create policy "schools_all_admin" on public.schools
  for all using (public.is_platform_admin());

-- school_applications: Public insert; platform admin can review
create policy "applications_insert_public" on public.school_applications
  for insert with check (true);

create policy "applications_select_admin" on public.school_applications
  for select using (public.is_platform_admin());

create policy "applications_update_admin" on public.school_applications
  for update using (public.is_platform_admin());

-- profiles: Users see own profile or staff in the same school
create policy "profiles_select" on public.profiles
  for select using (
    id = auth.uid() or
    public.is_school_staff(school_id) or
    public.is_platform_admin()
  );

create policy "profiles_update" on public.profiles
  for update using (
    id = auth.uid() or
    public.is_school_staff(school_id) or
    public.is_platform_admin()
  );

-- school_members: Visible to members of the same school
create policy "members_select" on public.school_members
  for select using (
    school_id in (select public.auth_school_ids()) or
    public.is_platform_admin()
  );

create policy "members_staff_modify" on public.school_members
  for all using (
    public.is_school_staff(school_id) or
    public.is_platform_admin()
  );

-- student_credentials: Strictly NO client access (service role bypasses RLS)
-- No policies defined => 0 access for anon/authenticated roles

-- topics: Global catalog readable by authenticated users
create policy "topics_select" on public.topics
  for select using (auth.role() = 'authenticated');

create policy "topics_admin_modify" on public.topics
  for all using (public.is_platform_admin());

-- user_topics: Visible within the same school
create policy "user_topics_select" on public.user_topics
  for select using (
    school_id in (select public.auth_school_ids()) or
    public.is_platform_admin()
  );

create policy "user_topics_modify" on public.user_topics
  for all using (
    user_id = auth.uid() or
    public.is_school_staff(school_id) or
    public.is_platform_admin()
  );

-- questions: School-specific or global (school_id is null)
create policy "questions_select" on public.questions
  for select using (
    school_id is null or
    school_id in (select public.auth_school_ids()) or
    public.is_platform_admin()
  );

create policy "questions_staff_modify" on public.questions
  for all using (
    (school_id is not null and public.is_school_staff(school_id)) or
    public.is_platform_admin()
  );

-- lessons: School-specific or global
create policy "lessons_select" on public.lessons
  for select using (
    school_id is null or
    school_id in (select public.auth_school_ids()) or
    public.is_platform_admin()
  );

create policy "lessons_staff_modify" on public.lessons
  for all using (
    (school_id is not null and public.is_school_staff(school_id)) or
    public.is_platform_admin()
  );

-- matches: Visible to participants, staff, or platform admin
create policy "matches_select" on public.matches
  for select using (
    learner_id = auth.uid() or
    tutor_id = auth.uid() or
    public.is_school_staff(school_id) or
    public.is_platform_admin()
  );

create policy "matches_insert" on public.matches
  for insert with check (
    school_id in (select public.auth_school_ids())
  );

create policy "matches_update" on public.matches
  for update using (
    learner_id = auth.uid() or
    tutor_id = auth.uid() or
    public.is_school_staff(school_id) or
    public.is_platform_admin()
  );

-- sessions: Visible to participants, staff, or platform admin
create policy "sessions_select" on public.sessions
  for select using (
    public.is_school_staff(school_id) or
    exists (
      select 1 from public.matches m
      where m.id = sessions.match_id
        and (m.learner_id = auth.uid() or m.tutor_id = auth.uid())
    ) or
    public.is_platform_admin()
  );

create policy "sessions_insert" on public.sessions
  for insert with check (
    school_id in (select public.auth_school_ids()) or
    public.is_platform_admin()
  );

-- session_events:
create policy "session_events_select" on public.session_events
  for select using (
    school_id in (select public.auth_school_ids()) or
    public.is_platform_admin()
  );

create policy "session_events_insert" on public.session_events
  for insert with check (
    school_id in (select public.auth_school_ids()) or
    public.is_platform_admin()
  );

-- reports: Any student/teacher can insert for their school; staff reviews
create policy "reports_insert" on public.reports
  for insert with check (
    school_id in (select public.auth_school_ids())
  );

create policy "reports_select_staff" on public.reports
  for select using (
    public.is_school_staff(school_id) or
    reporter_id = auth.uid() or
    public.is_platform_admin()
  );

-- audit_log: Staff can view school audit log; platform admin can view all
create policy "audit_select_staff" on public.audit_log
  for select using (
    public.is_school_staff(school_id) or
    public.is_platform_admin()
  );

-- 6. Safe View for Minors: Tutors Directory (hides private contacts)
create or replace view public.school_tutors_view as
select
  p.id,
  p.school_id,
  p.full_name,
  p.grade,
  p.class_stream,
  p.language,
  p.availability,
  ut.topic_id,
  ut.verified_score,
  ut.teacher_approved
from public.profiles p
join public.user_topics ut on ut.user_id = p.id and ut.school_id = p.school_id
join public.school_members sm on sm.user_id = p.id and sm.school_id = p.school_id
where sm.role = 'tutor'
  and sm.status = 'active'
  and ut.teacher_approved = true
  and ut.verified_score >= 0.8;
