-- Remove any existing policies
drop policy if exists "Can view own organization" on organizations;
drop policy if exists "Can insert during registration" on organizations;
drop policy if exists "Can update own organization" on organizations;
drop policy if exists "Can view own profile" on profiles;
drop policy if exists "Can view organization profiles" on profiles;
drop policy if exists "Can update own profile" on profiles;
drop policy if exists "Can insert during registration" on profiles;

-- Organizations Policies
create policy "Can view own organization"
  on organizations
  for select
  using (
    auth.uid() in (
      select id from profiles
      where organization_id = organizations.id
    )
  );

create policy "Anyone can create organization"
  on organizations
  for insert
  with check (true);

create policy "Can update own organization"
  on organizations
  for update
  using (
    auth.uid() in (
      select id from profiles
      where organization_id = organizations.id
      and role = 'admin'
    )
  )
  with check (
    auth.uid() in (
      select id from profiles
      where organization_id = organizations.id
      and role = 'admin'
    )
  );

-- Profiles Policies
create policy "Can view own profile"
  on profiles
  for select
  using (auth.uid() = id);

create policy "Can view organization profiles"
  on profiles
  for select
  using (
    organization_id in (
      select organization_id from profiles
      where id = auth.uid()
    )
  );

create policy "Can update own profile"
  on profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Anyone can create profile"
  on profiles
  for insert
  with check (auth.uid() = id);

-- Enable RLS
alter table organizations enable row level security;
alter table profiles enable row level security;

-- Grant Permissions
-- Schema usage
grant usage on schema public to postgres, anon, authenticated, service_role;

-- Table permissions
grant all on organizations, profiles to postgres, service_role;
grant select, insert, update on organizations to authenticated;
grant select, insert, update on profiles to authenticated;
grant execute on function complete_user_registration to authenticated;
grant execute on function get_registration_status to authenticated;
grant execute on function is_admin to authenticated;

-- Function permissions
grant execute on all functions in schema public to authenticated;

-- Comments for documentation
comment on policy "Anyone can create organization" on organizations is 'Enables organization creation during registration';
comment on policy "Anyone can create profile" on profiles is 'Enables profile creation during registration';
comment on policy "Can view own organization" on organizations is 'Users can view their own organization';
comment on policy "Can update own organization" on organizations is 'Admins can update their organization';
comment on policy "Can view own profile" on profiles is 'Users can view their own profile';
comment on policy "Can view organization profiles" on profiles is 'Users can view profiles in their organization';
