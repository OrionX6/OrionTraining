-- Function to check if a user is an admin
create or replace function is_admin(p_user_id uuid)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from profiles 
    where id = p_user_id 
    and role in ('admin', 'super_admin')
  );
$$;

-- Function to handle registration process
create or replace function complete_user_registration(
  p_user_id uuid,
  p_email text,
  p_organization_name text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_result json;
begin
  -- Input validation
  if p_email is null or p_email = '' then
    raise exception 'Email is required';
  end if;

  if p_organization_name is null or p_organization_name = '' then
    raise exception 'Organization name is required';
  end if;

  -- Check if user already has a profile
  if exists (select 1 from profiles where id = p_user_id) then
    raise exception 'Profile already exists for this user';
  end if;

  -- Create the organization
  insert into organizations (name)
  values (p_organization_name)
  returning id into v_organization_id;

  if v_organization_id is null then
    raise exception 'Failed to create organization';
  end if;

  -- Create the profile
  insert into profiles (
    id,
    email,
    organization_id,
    role,
    created_at,
    updated_at
  )
  values (
    p_user_id,
    p_email,
    v_organization_id,
    'admin',
    now(),
    now()
  );

  -- Return the result
  select json_build_object(
    'user_id', p_user_id,
    'organization_id', v_organization_id,
    'email', p_email,
    'organization_name', p_organization_name,
    'role', 'admin',
    'created_at', now()
  ) into v_result;

  return v_result;
exception
  when unique_violation then
    raise exception 'A user with this email already exists';
  when foreign_key_violation then
    raise exception 'Invalid user ID';
  when others then
    raise exception 'Registration failed: %', SQLERRM;
end;
$$;

-- Create a simpler function for checking registration status
create or replace function get_registration_status(p_user_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_result json;
begin
  select json_build_object(
    'has_profile', exists(select 1 from profiles where id = p_user_id),
    'is_admin', is_admin(p_user_id),
    'profile', (select row_to_json(p) from (
      select p.*, o.name as organization_name
      from profiles p
      left join organizations o on o.id = p.organization_id
      where p.id = p_user_id
    ) p)
  ) into v_result;
  
  return v_result;
end;
$$;
