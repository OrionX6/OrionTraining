-- Test script for registration flow

-- 1. Clean up existing data
do $$
begin
  -- Drop tables in correct order
  drop table if exists quiz_attempts;
  drop table if exists questions;
  drop table if exists quizzes;
  drop table if exists study_materials;
  drop table if exists quiz_categories;
  drop table if exists profiles;
  drop table if exists organizations;
  
  -- Drop types
  drop type if exists user_role;

  -- Delete all users
  delete from auth.users;
end $$;

-- 2. Initialize schema (from init.sql)
\i init.sql

-- 3. Apply registration flow
\i 20250309_registration_flow.sql

-- 4. Verify setup
select exists (
  select 1 from pg_type where typname = 'user_role'
) as "✓ user_role type exists";

select exists (
  select 1 from pg_tables where tablename = 'organizations'
) as "✓ organizations table exists";

select exists (
  select 1 from pg_tables where tablename = 'profiles'
) as "✓ profiles table exists";

select exists (
  select 1 from pg_proc where proname = 'create_user_with_organization'
) as "✓ registration function exists";

select exists (
  select 1 from pg_proc where proname = 'is_admin'
) as "✓ is_admin function exists";

select pol.polname as "✓ Policy exists: ", pol.polpermissive as "Is permissive"
from pg_policy pol
join pg_class cls on pol.polrelid = cls.oid
where cls.relname in ('organizations', 'profiles')
order by pol.polname;

-- 5. Show all enabled policies
select
    schemaname as schema,
    tablename as table,
    policyname as policy,
    permissive,
    roles,
    cmd as operation,
    qual as using,
    with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
