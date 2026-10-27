<USER_REQUEST>
# PeerLearn: Agent Build Spec (v2)

Offline-first peer-tutoring platform for Kenyan secondary schools. Stack: React 18 + TypeScript + Vite PWA, Supabase (Postgres, Auth, RLS, Realtime, Edge Functions), Vercel hosting.

## 0. Agent protocol

1. Read this file fully, then read the repo. Run the app and the tests. Report what exists and what is missing against this spec. **Change no code until the founder confirms.**
2. Work **one phase at a time** (section 8). Stop when the phase's Definition of Done passes. Report, then wait.
3. Extend existing code. Do not rewrite working parts.
4. When a requirement is ambiguous or a decision in section 10 is needed, **ask; do not guess.**
5. Commit small, with messages that cite requirement IDs (for example `AUTH-3: lock account after 5 failures`).

## 1. Non-negotiable rules

| ID | Rule |
|---|---|
| R1 | Offline-first. Lessons, quizzes, cached matches and session recording work with no internet. No student flow may depend on a live request. |
| R2 | Write locally first (IndexedDB outbox), sync later. Uploads are idempotent: upsert on `client_id`. Results are append-only; first write wins. |
| R3 | Every table has `school_id` and Row-Level Security. School A must never read School B. |
| R4 | Minors' data: collect the minimum. Never show phone numbers or private contacts between students. |
| R5 | Rows with `is_demo = true` are excluded from all real analytics and reports. |
| R6 | TypeScript strict. Share types between client and Edge Functions. |
| R7 | Secrets (service role key) only in Edge Functions or server env vars. Never in client code. |
| R8 | Tests required for matching, sync, auth edge cases and RLS. |

## 2. Roles

| Role | Can do |
|---|---|
| `platform_admin` | Approve schools, manage tenants, run demos, view platform analytics |
| `school_admin` | Manage the school, approve teachers and tutors, see all school data |
| `teacher` | Manage classes, approve tutors, author content, use dashboards |
| `tutor` | Accept matches, run sessions, see own results and ratings |
| `learner` | Request matches, take lessons and quizzes, rate tutors |

A student may be both learner and tutor on different topics. Store roles in `school_members`, not on the profile.

## 3. Requirements

### AUTH: Student login with registration number

Students have no email. Registration numbers are guessable, so the number alone never authenticates. Login = **school code + reg number + PIN**.

- AUTH-1: Each school has a unique `school_code`. `reg_number` is unique per school.
- AUTH-2: Teacher imports students by CSV. System creates profile, membership and a one-time **setup code** per student.
- AUTH-3: First login: school code + reg number + setup code, then the student sets a **6-digit PIN**.
- AUTH-4: Implement with Supabase Auth using a **synthetic email** (`{school_code}.{reg_number}@students.peerlearn.invalid`) with the PIN as password, created only inside Edge Functions with the service role key. The client calls `student-login` and receives a session. The client never builds or sees the synthetic email.
- AUTH-5: Lockout after 5 failed attempts for 15 minutes. Log failures. Add per-IP throttling.
- AUTH-6: Only a teacher or school admin can reset a PIN (issues a new setup code). Audit logged. No student self-reset.
- AUTH-7: Staff sign in with email and password or magic link.
- AUTH-8: After one online login, keep the session so the app works offline. Never store the PIN on the device. Provide "Sign out" and "Switch student" for shared devices.

### ONB: School registration and onboarding

- ONB-1: Public form: school name, county, type, contact teacher (name, phone, email), head teacher, student count, grades, subjects, consent checkbox.
- ONB-2: Status `pending` / `approved` / `rejected`, with email or SMS notice.
- ONB-3: On approval, create the tenant (status `sandbox`), generate `school_code`, create the first `school_admin`, send an invite.
- ONB-4: School lifecycle: `sandbox` → `pilot` → `active` (or `paused`). Only `platform_admin` changes it.

### CLS: Class and student management

- CLS-1: CSV import with columns `reg_number, full_name, grade, class_stream`. Validate, show row-level errors, skip duplicates, allow re-import.
- CLS-2: Add, edit and deactivate students manually.
- CLS-3: Printable setup-code sheet.
- CLS-4: Assign students to classes and subjects.

### DEMO: Sandbox and sample mode

- DEMO-1: Each approved school gets a demo class (fake students and tutors, at least 2 real lessons), all `is_demo = true`.
- DEMO-2: Guided "Try it now": one device plays learner, another plays tutor.
- DEMO-3: **Reset demo** deletes and re-seeds in seconds.
- DEMO-4: Guest demo link, no sign-up, expires after a few hours.

### SAFE: Safeguarding

- SAFE-1: A tutor needs a diagnostic score of 80% or more **and** teacher approval, per topic.
- SAFE-2: Teachers can suspend or remove tutors at any time.
- SAFE-3: Sessions take place at school at a teacher-approved time and place. No private contact details are shown.
- SAFE-4: "Report a problem" on every match and session goes to the school admin and teacher.
- SAFE-5: Guardian consent (flag and date) recorded before a learner participates.
- SAFE-6: Audit log for approvals, suspensions, reports and PIN resets.

### MATCH: Matching

- MATCH-1: Keep the existing explainable scoring. Hard filters: verified at 0.8 or higher for the topic, tutor grade at or above learner grade, gap at most 2, same school.
- MATCH-2: Weighted score: mastery, same school, language, schedule overlap, tutor load, past rating, **average learner gain**.
- MATCH-3: Return the top 3; the learner chooses. "Why this match?" shows the point breakdown.
- MATCH-4: Lifecycle: `proposed`, `accepted`, `declined`, `scheduled`, `completed`, `cancelled`. Teacher approval where the school enables it.
- MATCH-5: Matching also runs client-side on cached tutor data when offline.

### OFF: Offline lessons and sessions

- OFF-1: One-tap download per topic; bulk download per grade. Show size and an "Available offline" badge. Allow clearing old packs.
- OFF-2: Versioned lesson packs; update only when the version changes.
- OFF-3: Session flow: pre-quiz (3 questions), lesson with 20-minute timer and tutor checklist, post-quiz, results card with gain, rating (1 to 5 plus tags).
- OFF-4: All results go to the outbox, then sync idempotently.

### PROOF: Question bank and evidence

- PROOF-1: Questions tagged by topic, sub-skill, difficulty and language.
- PROOF-2: Pre and post quizzes **must use different questions**.
- PROOF-3: **Retention check** about 7 days after a session, stored as `retention_score`.
- PROOF-4: Reports show immediate gain and retention gain.
- PROOF-5: Optional comparison-group flag on learners for pilot reporting.

### LIVE: Real-time session events

- LIVE-1: Sessions write events: `started`, `pre_quiz_done`, `step_checked`, `post_quiz_done`, `ended`.
- LIVE-2: Teachers and admins subscribe via Supabase Realtime filtered by `school_id`.
- LIVE-3: Offline devices queue events; they appear on reconnect. Show "N sessions waiting to sync".

### DASH: Dashboards and admin

- DASH-1: Teacher: topic struggle heatmap, baseline vs post bars, no-improvement flags, tutor table, live feed, CSV and PDF export.
- DASH-2: Platform admin: application queue, school health table (students, tutors, sessions, average gain, last activity), status controls, impact reports (demo excluded), demo controls.

### CONT: Content authoring

- CONT-1: Teacher lesson editor (title, tutor guide steps, practice, quiz, topic, grade, language) and question bank editor.
- CONT-2: Draft and publish. Publishing bumps `version`.
- CONT-3: Per-school content plus a platform library managed by `platform_admin`.

### I18N and A11Y

- I18N-1: English and Kiswahili. All strings in language files.
- A11Y-1: Large touch targets, high contrast, screen-reader labels, low-data mode without images.

### LATER (do not start until phases 1 to 6 pass)

Africa's Talking SMS/USSD, QR handoff of results or packs, group sessions, adaptive practice with prerequisite links, tutor training micro-lessons and certificates.

## 4. Data model (Postgres)

All tables below have RLS enabled. Add `school_id` to anything not shown with it.

```sql
create table schools (
  id uuid primary key default gen_random_uuid(),
  name text not null, county text,
  school_code text unique not null,
  status text default 'sandbox' check (status in ('sandbox','pilot','active','paused')),
  pilot_started_at timestamptz, created_at timestamptz default now()
);

create table school_applications (
  id uuid primary key default gen_random_uuid(),
  school_name text, county text, school_type text,
  contact_name text, contact_phone text, contact_email text,
  student_count int, grades int[], subjects text[],
  consent_given boolean default false,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now()
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  school_id uuid references schools,
  full_name text, reg_number text, grade int, class_stream text,
  language text default 'en', availability jsonb default '{}',
  is_demo boolean default false, guardian_consent_at timestamptz,
  unique (school_id, reg_number)
);

create table school_members (
  school_id uuid references schools, user_id uuid references profiles,
  role text check (role in ('school_admin','teacher','tutor','learner')),
  status text default 'active',
  primary key (school_id, user_id, role)
);

create table student_credentials (          -- service role only; no client access
  user_id uuid primary key references profiles, school_id uuid references schools,
  setup_code_hash text, setup_used boolean default false,
  failed_attempts int default 0, locked_until timestamptz
);

create table topics (id serial primary key, subject text, name text, grade int);

create table user_topics (
  user_id uuid references profiles, school_id uuid references schools,
  topic_id int references topics,
  level text check (level in ('strong','needs_help')),
  verified_score numeric, teacher_approved boolean default false,
  primary key (user_id, topic_id)
);

create table questions (
  id serial primary key, school_id uuid references schools,
  topic_id int references topics, sub_skill text, difficulty int,
  language text default 'en', body jsonb      -- {q, options[], answer}
);

create table lessons (
  id serial primary key, school_id uuid references schools,
  topic_id int references topics, title text,
  tutor_guide jsonb, practice jsonb,
  version int default 1, status text default 'draft'
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools,
  learner_id uuid references profiles, tutor_id uuid references profiles,
  topic_id int references topics, score numeric, why jsonb,
  status text default 'proposed', scheduled_at timestamptz, location text,
  is_demo boolean default false
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools, match_id uuid references matches,
  topic_id int references topics,
  pre_score numeric, post_score numeric, retention_score numeric,
  learner_rating int, rating_tags text[],
  client_id text unique not null,           -- idempotency key
  is_demo boolean default false,
  created_at timestamptz default now(), synced_at timestamptz default now()
);

create table session_events (
  id bigserial primary key, school_id uuid references schools,
  session_id uuid references sessions, type text, payload jsonb,
  created_at timestamptz default now()
);
alter publication supabase_realtime add table session_events;

create table reports (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools, reporter_id uuid references profiles,
  match_id uuid references matches, reason text,
  status text default 'open', created_at timestamptz default now()
);

create table audit_log (
  id bigserial primary key, school_id uuid, actor_id uuid,
  action text, detail jsonb, created_at timestamptz default now()
);
```

### RLS principles

- Access is limited to rows whose `school_id` is in the caller's schools (helper such as `auth_school_ids()`).
- Learners and tutors see only their own sessions and matches. Teachers see their school. `platform_admin` uses a dedicated role claim.
- `student_credentials` is never readable by clients.
- Learners see tutors through a view exposing only name, grade, verified score and availability.
- Test every table: a School A user gets zero rows from School B.

## 5. Edge Functions

| Function | Purpose |
|---|---|
| `student-login` | Verify school code, reg number and PIN; enforce lockout; return session |
| `student-first-setup` | Verify setup code, set PIN, mark setup used |
| `import-students` | Parse and validate CSV; create profiles, memberships, setup codes |
| `reset-pin` | Issue a new setup code; audit logged |
| `approve-school` | Create tenant, school code, first admin; send invite |
| `seed-demo` / `reset-demo` | Create or wipe a school's demo class |
| `generate-report` | Per-school or platform impact report, demo excluded |
| `schedule-retention` | Create retention tasks 7 days after sessions |

Device uploads of sessions use a table upsert on `client_id` under RLS. No custom endpoint is needed.

## 6. Environments

`local`, `staging`, `production`: each with its own Supabase project and Vercel environment. HTTPS is required for the service worker.

## 7. Testing

- **Playwright offline test:** log in, download a lesson, go offline, complete pre-quiz, session and post-quiz, go online, sync repeatedly, and assert exactly one session row.
- **Unit:** matching hard filters, ranking order, top-3 limit, offline matching.
- **Security:** RLS isolation on every table, lockout, no client access to credentials, no contact details exposed.
- **Real device:** test on a low-cost Android phone over HTTPS.
- Keep a seeded local demo mode for when venue Wi-Fi fails.

## 8. Phases and Definition of Done

| Phase | Build | Done when |
|---|---|---|
| 1. Foundation | Move to Supabase; apply schema, RLS and multi-school model | All tables exist; RLS tests pass; School B data invisible to School A |
| 2. Registration and login | ONB, CLS, AUTH | Imported student sets PIN, logs in on a second device, is locked after 5 bad PINs, and is reset by a teacher; no cross-school login |
| 3. Safeguarding | SAFE | Unapproved tutors never appear in matches; a report reaches the school admin |
| 4. Proof | PROOF | Pre and post quizzes never share questions; retention score recorded and reported |
| 5. Sandbox and live | DEMO, LIVE | Demo session on one device appears live on another; offline sessions appear after reconnect |
| 6. Dashboards and content | DASH, CONT | Teacher publishes a lesson students download; reports exclude demo data |
| 7. Polish | I18N, A11Y, storage management, then LATER items | Kiswahili complete; accessibility pass |

## 9. Data protection

- Treat all learner data as children's data under Kenya's Data Protection Act. Collect only what is needed.
- Provide a plain-language privacy policy and a school data agreement template.
- Support deletion and export of a student's data on school request.
- Obtain guardian consent before a learner joins a pilot.

## 10. Open decisions (ask the founder; do not guess)

1. Curriculum first: 8-4-4 or CBC, and the pilot subject and grade.
2. Who pays first: school, sponsor, or telco partner.
3. Teacher approval for every match, or only new tutors.
4. Pricing per school per term.
5. Guardian consent on paper, in app, or both..............make the adjustments
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-10-26T14:55:14+03:00.

The user's current state is as follows:
Active Document: c:\Users\Administrator\Desktop\Work\peerlearn\README.md (LANGUAGE_MARKDOWN)
Cursor is on line: 1
Other open documents:
- c:\Users\Administrator\Desktop\Work\peerlearn\README.md (LANGUAGE_MARKDOWN)
- c:\Users\Administrator\Desktop\Work\peerlearn\shared\types.ts (LANGUAGE_TYPESCRIPT)
- c:\Users\Administrator\Desktop\Work\peerlearn\web\index.html (LANGUAGE_HTML)
- c:\Users\Administrator\Desktop\Work\peerlearn\web\src\db.ts (LANGUAGE_TYPESCRIPT)
Running terminal commands:
- npm run dev (in c:\Users\Administrator\Desktop\Work\peerlearn, running for 32m58s)
</ADDITIONAL_METADATA>