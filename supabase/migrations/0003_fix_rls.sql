-- Drop the conflicting policies
drop policy if exists "users see own gym" on users;
drop policy if exists "users can see own profile" on users;
drop policy if exists "gyms are publicly readable" on gyms;

-- Simple, non-recursive policy: users can only see their own row
create policy "users can see own row" on users
  for select using (id = auth.uid());

-- Users can update their own row
create policy "users can update own row" on users
  for update using (id = auth.uid());

-- Allow anyone to read gyms (needed for subdomain resolution)
create policy "gyms are publicly readable" on gyms
  for select using (true);

-- Allow users to read gym via join from users table
create policy "users can read own gym join" on users
  for select using (id = auth.uid());