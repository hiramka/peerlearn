-- Production schema (Postgres / Supabase). Run when you replace the in-memory data.
create table schools (id uuid primary key default gen_random_uuid(), name text not null, county text);
create table profiles (
  id uuid primary key references auth.users, name text not null,
  role text check (role in ('learner','tutor','both')),
  school_id uuid references schools, grade int, language text default 'en',
  phone text, availability jsonb default '{}', created_at timestamptz default now()
);
create table topics (id serial primary key, subject text, name text, grade int);
create table user_topics (
  user_id uuid references profiles, topic_id int references topics,
  level text check (level in ('strong','needs_help')), verified_score numeric,
  primary key (user_id, topic_id)
);
create table lessons (id serial primary key, topic_id int references topics, title text,
  content jsonb not null, version int default 1);
create table matches (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid references profiles, tutor_id uuid references profiles,
  topic_id int references topics, score numeric,
  status text default 'proposed', scheduled_at timestamptz
);
create table sessions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches, pre_score numeric, post_score numeric,
  learner_rating int, tutor_rating int,
  client_id text unique not null,           -- idempotency key from offline clients
  synced_at timestamptz default now()
);
create index on user_topics (topic_id, level);
alter table profiles enable row level security;
create policy "own profile" on profiles for select using (auth.uid() = id);
