# Email Verification Troubleshooting Guide

## Quick Setup Checklist

1. **Supabase Dashboard Settings**
   - [ ] Authentication -> Providers -> Email is enabled
   - [ ] Authentication -> Email Templates -> "Confirm Signup" is configured
   - [ ] Authentication -> URL Configuration -> Site URL is set to `http://localhost:3000`
   - [ ] Authentication -> URL Configuration -> Redirect URLs includes `http://localhost:3000/*`

2. **Local Environment**
   - [ ] `.env` has correct Supabase URL and anon key
   - [ ] `REACT_APP_ENABLE_REGISTRATION=true` in `.env`
   - [ ] Development server is running on port 3000

## Debugging Steps

1. **Run Email Verification Check**
   ```sql
   -- In Supabase SQL Editor
   drop schema public cascade;
   create schema public;
   
   -- Run setup scripts in order
   1. setup_full.sql
   2. registration_function.sql
   3. policies.sql
   
   -- Then run verification script
   4. verify_email_settings.sql
   ```

2. **Check Browser Console**
   - Look for any errors during registration
   - Check the debug information panel (in development mode)
   - Verify the signup API call response

3. **Verify Email Provider**
   ```sql
   -- Check email provider status
   select * from auth.providers where provider_id = 'email';
   
   -- Check recent email attempts
   select * from auth.users
   where email_confirmed_at is null
   and created_at > now() - interval '1 hour'
   order by created_at desc
   limit 5;
   ```

## Common Issues and Solutions

1. **No Email Received**
   - Check spam folder
   - Verify email provider is enabled
   - Make sure Site URL is correct
   - Try the resend verification option
   - Check rate limits (max 3 attempts)

2. **Email Link Not Working**
   - Verify redirect URLs are configured
   - Check that Site URL matches your development environment
   - Clear browser cookies and try again
   - Check email template configuration

3. **Registration Function Errors**
   - Run `verify_setup.sql` to check database setup
   - Verify RLS policies are correctly applied
   - Check function permissions

## Testing Email Flow

1. Register a new account with test email
2. Check browser console for debug information
3. Wait for verification email (usually < 1 minute)
4. If no email arrives:
   - Try resending verification
   - Check Supabase logs for errors
   - Run email verification check script

## Development Tips

1. Enable debug mode in your browser console:
   ```javascript
   localStorage.setItem('debug', 'true');
   ```

2. Monitor email events in Supabase:
   ```sql
   select * from auth.audit_log_entries
   where created_at > now() - interval '1 hour'
   order by created_at desc;
   ```

3. Test with different email providers:
   - Gmail
   - Outlook
   - Yahoo
   - Custom domain emails

## Support Resources

1. Supabase Auth Documentation
   - [Email Authentication](https://supabase.com/docs/guides/auth/auth-email)
   - [Custom Email Templates](https://supabase.com/docs/guides/auth/auth-email#customize-email-templates)

2. Local Development
   - [Setting up Supabase CLI](https://supabase.com/docs/guides/cli)
   - [Email Testing Guide](https://supabase.com/docs/guides/auth/auth-email#testing)
