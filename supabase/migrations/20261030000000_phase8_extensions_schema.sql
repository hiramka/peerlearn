-- ============================================================================
-- Phase 8 & 9 Extensions Schema: Pedagogical Training, Adaptive Graph,
-- Group Tutoring Sessions, Telecom (USSD/SMS) and QR Audit Trails.
-- All tables enforce Multi-Tenant Row-Level Security (Rule R3).
-- ============================================================================

-- 1. Tutor Training Modules (Curriculum for Pedagogical Verification)
create table if not exists tutor_training_modules (
  id text primary key,
  title text not null,
  subtitle text,
  principles text[] not null,
  scenario text not null,
  quiz jsonb not null, -- { question, options[], correctAnswer, explanation }
  created_at timestamptz default now()
);

-- Public read for training modules
alter table tutor_training_modules enable row level security;
create policy "Anyone can read training modules"
  on tutor_training_modules for select
  using (true);

-- 2. Tutor Training Progress
create table if not exists tutor_training_progress (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools not null,
  tutor_id uuid references profiles not null,
  completed_module_ids text[] default '{}',
  certified_badge boolean default false,
  certified_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (school_id, tutor_id)
);

alter table tutor_training_progress enable row level security;

create policy "Tutors can view own training progress"
  on tutor_training_progress for select
  using (tutor_id = auth.uid() or is_school_staff(school_id));

create policy "Tutors can update own training progress"
  on tutor_training_progress for update
  using (tutor_id = auth.uid());

create policy "Tutors can insert own training progress"
  on tutor_training_progress for insert
  with check (tutor_id = auth.uid());

-- 3. Topic Prerequisites Knowledge Graph
create table if not exists topic_prerequisites (
  id serial primary key,
  topic_id int references topics not null,
  prerequisite_topic_id int references topics not null,
  created_at timestamptz default now(),
  unique (topic_id, prerequisite_topic_id)
);

alter table topic_prerequisites enable row level security;
create policy "Anyone can read topic prerequisite graph"
  on topic_prerequisites for select
  using (true);

-- 4. Small-Group Tutoring Matches
create table if not exists group_matches (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools not null,
  tutor_id uuid references profiles not null,
  topic_id int references topics not null,
  learner_ids uuid[] not null,
  scheduled_at text not null,
  location text,
  status text default 'scheduled' check (status in ('scheduled','in_progress','completed','cancelled')),
  is_demo boolean default false,
  created_at timestamptz default now()
);

alter table group_matches enable row level security;

create policy "School members can view school group matches"
  on group_matches for select
  using (
    school_id in (select s.school_id from school_members s where s.user_id = auth.uid())
    or auth_is_platform_admin()
  );

create policy "Staff and tutors can insert group matches"
  on group_matches for insert
  with check (
    is_school_staff(school_id) or tutor_id = auth.uid()
  );

-- 5. Small-Group Session Results
create table if not exists group_sessions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools not null,
  group_match_id uuid references group_matches,
  topic_id int references topics not null,
  tutor_id uuid references profiles not null,
  learner_results jsonb not null, -- [{ learnerId, preScore, postScore, gain }]
  avg_gain numeric not null,
  client_id text unique not null, -- Idempotency key (R2)
  is_demo boolean default false,
  created_at timestamptz default now(),
  synced_at timestamptz default now()
);

alter table group_sessions enable row level security;

create policy "School members can view group sessions"
  on group_sessions for select
  using (
    school_id in (select s.school_id from school_members s where s.user_id = auth.uid())
    or auth_is_platform_admin()
  );

create policy "Tutors and staff can insert group sessions"
  on group_sessions for insert
  with check (
    tutor_id = auth.uid() or is_school_staff(school_id)
  );

-- 6. Telecom SMS Logs (Outbound Audit Trail)
create table if not exists telecom_sms_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools not null,
  recipient_phone text not null,
  message text not null,
  status text default 'delivered',
  created_at timestamptz default now()
);

alter table telecom_sms_logs enable row level security;

create policy "Staff can view school SMS logs"
  on telecom_sms_logs for select
  using (is_school_staff(school_id) or auth_is_platform_admin());

-- 7. QR Transfer Ingestion Audit Logs
create table if not exists qr_transfer_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools not null,
  transfer_type text not null,
  checksum text not null,
  client_id text,
  ingested_by uuid,
  created_at timestamptz default now()
);

alter table qr_transfer_logs enable row level security;

create policy "Staff can view QR transfer logs"
  on qr_transfer_logs for select
  using (is_school_staff(school_id) or auth_is_platform_admin());
