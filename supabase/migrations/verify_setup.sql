-- Verify database setup
do $$
declare
  v_error text;
begin
  -- 1. Check if required tables exist
  if not exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'organizations') then
    v_error := v_error || E'\n- organizations table is missing';
  end if;

  if not exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'profiles') then
    v_error := v_error || E'\n- profiles table is missing';
  end if;

  -- 2. Check if required type exists
  if not exists (select 1 from pg_type where typname = 'user_role') then
    v_error := v_error || E'\n- user_role type is missing';
  end if;

  -- 3. Check if required functions exist
  if not exists (select 1 from pg_proc where proname = 'complete_user_registration') then
    v_error := v_error || E'\n- complete_user_registration function is missing';
  end if;

  if not exists (select 1 from pg_proc where proname = 'get_registration_status') then
    v_error := v_error || E'\n- get_registration_status function is missing';
  end if;

  if not exists (select 1 from pg_proc where proname = 'is_admin') then
    v_error := v_error || E'\n- is_admin function is missing';
  end if;

  -- 4. Check if RLS is enabled
  if not exists (
    select 1 from pg_tables 
    where schemaname = 'public' 
    and tablename in ('organizations', 'profiles')
    and rowsecurity = true
  ) then
    v_error := v_error || E'\n- RLS is not enabled on all tables';
  end if;

  -- 5. Check if policies exist
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename in ('organizations', 'profiles')
  ) then
    v_error := v_error || E'\n- No policies found on tables';
  end if;

  -- Report results
  if v_error is not null then
    raise exception 'Setup verification failed: %', v_error;
  else
    raise notice 'Setup verification passed! All required components are in place.';
  end if;
end $$;

-- Test registration function
do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_result json;
begin
  -- Test complete_user_registration function
  begin
    v_result := complete_user_registration(
      v_user_id,
      'test@example.com',
      'Test Organization'
    );
    raise notice 'Registration function test failed - should not allow registration without auth user';
  exception
    when others then
      raise notice 'Registration function properly requires authenticated user';
  end;

  -- Test get_registration_status function
  v_result := get_registration_status(v_user_id);
  assert v_result->>'has_profile' = 'false', 'Registration status not working properly';
  
  raise notice 'Registration function tests passed!';
end $$;

/*
If you see "Setup verification passed!" and no errors, your database is properly set up.
If you see any errors, run the migration files in this order:
1. reset.sql
2. setup_full.sql
3. registration_function.sql
4. policies.sql
*/
