-- ============================================================================
-- PeerLearn v2 - Phase 1: Multi-School RLS Isolation Test
-- Verifies: School B data is strictly invisible to School A users
-- ============================================================================

begin;

-- 1. Create two separate test tenants
insert into public.schools (id, name, school_code, status)
values 
  ('11111111-1111-1111-1111-111111111111', 'Alliance High (School A)', 'SCH-A', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'Mangu High (School B)', 'SCH-B', 'active')
on conflict (id) do nothing;

-- 2. Create users in School A and School B
-- Note: auth.users mocked for local testing if running within Supabase
insert into public.profiles (id, school_id, full_name, reg_number, grade, language)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Student A', 'ADM-001', 2, 'en'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Student B', 'ADM-002', 2, 'en')
on conflict (id) do nothing;

insert into public.school_members (school_id, user_id, role, status)
values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'learner', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'learner', 'active')
on conflict (school_id, user_id, role) do nothing;

-- 3. Insert secret credentials (service role only)
insert into public.student_credentials (user_id, school_id, setup_code_hash)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'hash_a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'hash_b')
on conflict (user_id) do nothing;

-- 4. Insert topics and questions for each school
insert into public.topics (id, subject, name, grade)
values (1, 'Math', 'Linear Equations', 2)
on conflict (id) do nothing;

insert into public.questions (school_id, topic_id, body)
values
  ('11111111-1111-1111-1111-111111111111', 1, '{"q": "School A Question", "options": ["1","2"], "answer": 0}'),
  ('22222222-2222-2222-2222-222222222222', 1, '{"q": "School B Question", "options": ["1","2"], "answer": 0}');

-- 5. Insert sessions
insert into public.sessions (school_id, topic_id, pre_score, post_score, client_id)
values
  ('11111111-1111-1111-1111-111111111111', 1, 0.4, 0.8, 'session-client-a'),
  ('22222222-2222-2222-2222-222222222222', 1, 0.3, 0.7, 'session-client-b')
on conflict (client_id) do nothing;

-- ============================================================================
-- VERIFICATION QUERIES (Simulating Student A from School A)
-- ============================================================================

-- A. Set current auth context as Student A (School A)
set local role authenticated;
set local "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Assertion 1: Student A must see exactly their school (School A) and NOT School B
select 
  count(*) as school_a_visible_count,
  (select count(*) from public.schools where id = '22222222-2222-2222-2222-222222222222') as school_b_visible_count
from public.schools;
-- EXPECTED: school_a_visible_count = 1, school_b_visible_count = 0

-- Assertion 2: Student A cannot see School B's profiles
select count(*) as school_b_profiles_visible
from public.profiles
where school_id = '22222222-2222-2222-2222-222222222222';
-- EXPECTED: 0

-- Assertion 3: Student A cannot read ANY student_credentials (service role only)
select count(*) as credentials_visible from public.student_credentials;
-- EXPECTED: 0

-- Assertion 4: Student A sees only School A's questions
select count(*) as school_b_questions_visible
from public.questions
where school_id = '22222222-2222-2222-2222-222222222222';
-- EXPECTED: 0

-- Assertion 5: Student A cannot see School B sessions
select count(*) as school_b_sessions_visible
from public.sessions
where school_id = '22222222-2222-2222-2222-222222222222';
-- EXPECTED: 0

rollback;
