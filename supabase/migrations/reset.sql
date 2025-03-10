-- Step 1: Reset Database
drop schema public cascade;
create schema public;
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, authenticated, service_role;
grant all on all functions in schema public to postgres, authenticated, service_role;
grant all on all sequences in schema public to postgres, authenticated, service_role;

-- Instructions for setting up the database:
/*
Run these files in the Supabase SQL Editor in this exact order:

1. First run this reset.sql file
2. Then run setup_full.sql to create:
   - Basic schema
   - Tables (organizations, profiles)
   - Types (user_role)
   - Basic triggers
3. Then run registration_function.sql to create:
   - is_admin function
   - complete_user_registration function
   - get_registration_status function
4. Finally run policies.sql to set up:
   - Row Level Security (RLS)
   - Access permissions
   - All necessary grants

After running these scripts:
1. The database will be reset and clean
2. All necessary tables and functions will be created
3. All permissions will be properly set up
4. The registration flow will be ready to use

You can ignore all other SQL files in the migrations folder as they've been 
consolidated into these core files.
*/
