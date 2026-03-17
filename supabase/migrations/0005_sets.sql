-- Add sets table for individual set tracking
create table sets (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references gyms(id) on delete cascade,
  exercise_id uuid references exercises(id) on delete cascade,
  set_number int not null,
  weight_kg numeric,
  reps int,
  rpe numeric check (rpe >= 1 and rpe <= 10),
  completed boolean default false,
  created_at timestamptz default now()
);

alter table sets enable row level security;

create policy "members can insert sets" on sets
  for insert with check (
    gym_id = (select gym_id from users where id = auth.uid())
  );

create policy "members can read own sets" on sets
  for select using (
    exercise_id in (
      select e.id from exercises e
      join workouts w on e.workout_id = w.id
      where w.user_id = auth.uid()
    )
  );

create policy "members can update own sets" on sets
  for update using (
    exercise_id in (
      select e.id from exercises e
      join workouts w on e.workout_id = w.id
      where w.user_id = auth.uid()
    )
  );