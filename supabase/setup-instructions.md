# Supabase Setup Instructions

## Step 1: Initial Database Reset
1. Open Supabase SQL Editor
2. Run `reset.sql`
   - This will reset the public schema
   - Set up basic permissions

## Step 2: Create Schema and Tables
1. Run `setup_full.sql`
   - Creates organizations table
   - Creates profiles table
   - Creates user_role type
   - Sets up triggers for timestamps

## Step 3: Create Registration Functions
1. Run `registration_function.sql`
   - Creates complete_user_registration function
   - Creates get_registration_status function
   - Creates is_admin helper function

## Step 4: Set Up Security Policies
1. Run `policies.sql`
   - Sets up Row Level Security (RLS)
   - Creates access policies
   - Sets up proper permissions

## Step 5: Verify Setup
1. Run `verify_setup.sql`
   - Checks if all tables exist
   - Verifies functions are created
   - Tests basic functionality
   - Reports any missing components

## Expected Output
After running verify_setup.sql, you should see:
```
Setup verification passed! All required components are in place.
Registration function properly requires authenticated user
Registration function tests passed!
```

## Troubleshooting
If you see any errors:
1. Make sure you ran the scripts in the correct order
2. Check Supabase logs for detailed error messages
3. If needed, start over from Step 1

## Important Notes
- Make sure email authentication is enabled in Supabase Auth settings
- Site URL should be set to http://localhost:3000 in development
- Email verification should be enabled
- Redirect URLs should include http://localhost:3000/*
