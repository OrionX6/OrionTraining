# Complete Fix for Database Access Issues

This document provides instructions for applying a comprehensive fix to the database access issues you've been experiencing. The fix consists of two parts:

1. **Nuclear Option Fix**: Completely rebuilds your Row Level Security (RLS) policies to avoid recursion
2. **Function Overloading Fix**: Resolves the function overloading issue that prevents creating new users

## Step 1: Apply the Nuclear Option Fix

First, run the nuclear option fix to rebuild your RLS policies:

```sql
-- Run this file
supabase/migrations/nuclear_option_fix.sql
```

This fix:

- Drops ALL existing policies on the profiles, organizations, regions, and region_admins tables
- Creates helper functions that bypass RLS for critical operations
- Creates simplified, non-recursive policies that implement the core access requirements
- Updates critical functions to use SECURITY DEFINER to bypass RLS
- Adds performance indexes

## Step 2: Apply the Function Overloading Fix

Next, run the function overloading fix to resolve the issue with creating new users:

```sql
-- Run this file
supabase/migrations/fix_function_overloading.sql
```

This fix:

- Drops all versions of the create_user_profile function
- Creates a new create_user_profile_v2 function with a unique name to avoid conflicts
- Updates the complete_user_registration function to use the new function
- Grants necessary permissions

## Step 3: Verify the Frontend Code

The UserService.ts file has been updated to use the new create_user_profile_v2 function. Make sure you're using the latest version of this file.

## After Applying the Fixes

After applying both fixes, you should be able to:

1. Log in with your super admin account
2. Create regions
3. Assign admins to regions
4. Have regional admins create users for their region

## Verification

You can verify that the fixes were applied correctly by:

1. Checking that you can log in with your super admin account
2. Creating a new region
3. Creating a new user with a regional admin role
4. Logging in with that new user and verifying they have the correct permissions

## Troubleshooting

If you still encounter issues after applying these fixes:

1. Clear your browser cache and try logging in again
2. Check the browser console for any errors
3. Verify that all the helper functions were created correctly
4. Verify that all the policies were created correctly
5. Check that the UserService.ts file is using the create_user_profile_v2 function

## Technical Details

### Nuclear Option Fix

The nuclear option fix creates several helper functions with the SECURITY DEFINER attribute, which makes them run with the privileges of the function creator (bypassing RLS):

- `is_service_role()` - Checks if the request is from a service role
- `get_user_role_direct()` - Gets a user's role without triggering RLS
- `get_user_organization_direct()` - Gets a user's organization without triggering RLS
- `get_user_region_direct()` - Gets a user's region without triggering RLS
- `is_super_admin_direct()` - Checks if a user is a super admin without triggering RLS
- `is_org_admin_direct()` - Checks if a user is an organization admin without triggering RLS
- `is_region_admin_direct()` - Checks if a user is a region admin without triggering RLS

### Function Overloading Fix

The function overloading fix creates a new function with a unique name to avoid conflicts:

- `create_user_profile_v2()` - Creates user profiles with the same functionality as the original function

This approach ensures that there's no ambiguity when calling the function, which resolves the PGRST203 error.
