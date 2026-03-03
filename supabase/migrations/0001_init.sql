-- Gyms
create table gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subdomain text unique not null,
  logo_url text,
  primary_color text default '#000000',
  secondary_color text default '#ffffff',
  welcome_message text,
  created_at timestamptz default now()
);

-- Users (extends Supabase auth.users)
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  gym_id uuid references gyms(id) on delete cascade,
  full_name text,
  role text check (role in ('member', 'trainer', 'admin')) default 'member',
  created_at timestamptz default now()
);

-- Workouts
create table workouts (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references gyms(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  logged_at timestamptz default now(),
  notes text,
  created_at timestamptz default now()
);

-- Exercises
create table exercises (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references gyms(id) on delete cascade,
  workout_id uuid references workouts(id) on delete cascade,
  name text not null,
  sets int,
  reps int,
  weight_kg numeric,
  rpe numeric check (rpe >= 1 and rpe <= 10),
  created_at timestamptz default now()
);

-- AI Reports
create table ai_reports (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references gyms(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  report_type text check (report_type in ('fatigue', 'progression', 'weekly_summary', 'trainer_analysis')),
  payload jsonb not null,
  generated_at timestamptz default now()
);

-- Leaderboard Snapshots
create table leaderboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references gyms(id) on delete cascade,
  snapshot_date date not null,
  type text check (type in ('volume', '1rm', 'consistency', 'monthly_progress')),
  data jsonb not null,
  created_at timestamptz default now()
);

-- RLS: Enable on all tables
alter table gyms enable row level security;
alter table users enable row level security;
alter table workouts enable row level security;
alter table exercises enable row level security;
alter table ai_reports enable row level security;
alter table leaderboard_snapshots enable row level security;

-- RLS Policies: users can only see their own gym's data
create policy "users see own gym" on users
  for select using (gym_id = (select gym_id from users where id = auth.uid()));

create policy "workouts gym isolation" on workouts
  for all using (gym_id = (select gym_id from users where id = auth.uid()));

create policy "exercises gym isolation" on exercises
  for all using (gym_id = (select gym_id from users where id = auth.uid()));

create policy "ai_reports gym isolation" on ai_reports
  for all using (gym_id = (select gym_id from users where id = auth.uid()));

create policy "leaderboard gym isolation" on leaderboard_snapshots
  for select using (gym_id = (select gym_id from users where id = auth.uid()));