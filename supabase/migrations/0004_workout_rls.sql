-- Allow members to insert their own workouts
create policy "members can insert workouts" on workouts
  for insert with check (
    user_id = auth.uid() and
    gym_id = (select gym_id from users where id = auth.uid())
  );

-- Allow members to read their own workouts
create policy "members can read own workouts" on workouts
  for select using (user_id = auth.uid());

-- Allow members to insert exercises
create policy "members can insert exercises" on exercises
  for insert with check (
    gym_id = (select gym_id from users where id = auth.uid())
  );

-- Allow members to read their own exercises
create policy "members can read own exercises" on exercises
  for select using (
    workout_id in (
      select id from workouts where user_id = auth.uid()
    )
  );