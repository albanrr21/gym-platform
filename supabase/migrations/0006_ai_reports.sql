-- Already have ai_reports table from 0001, just add RLS policies
create policy "members can insert own ai reports" on ai_reports
  for insert with check (
    user_id = auth.uid() and
    gym_id = (select gym_id from users where id = auth.uid())
  );

create policy "members can read own ai reports" on ai_reports
  for select using (user_id = auth.uid());