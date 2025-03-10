-- Note: We can't directly check auth.providers in newer Supabase versions
-- Instead, we'll provide instructions for checking in the Supabase dashboard
do $$
begin
  raise notice 'Email Provider Status: Cannot directly check (access restricted)';
  raise notice 'Please verify in Supabase Dashboard: Authentication -> Providers -> Email';
end $$;

-- Check URL configuration
-- Note: We can't directly access auth.config in newer Supabase versions
do $$
begin
  raise notice 'URL Configuration: Cannot directly check (access restricted)';
  raise notice 'Please verify in Supabase Dashboard: Authentication -> URL Configuration';
  raise notice 'Site URL should be: http://localhost:3000';
  raise notice 'Redirect URLs should include: http://localhost:3000/*';
end $$;

-- Note: We can't directly check auth.users in newer Supabase versions
do $$
begin
  raise notice 'Recent Registration Attempts: Cannot directly check (access restricted)';
  raise notice 'Please check in Supabase Dashboard: Authentication -> Users';
end $$;

-- Note: We can't directly check auth.mfa_templates in newer Supabase versions
do $$
begin
  raise notice 'Email Templates: Cannot directly check (access restricted)';
  raise notice 'Please verify in Supabase Dashboard: Authentication -> Email Templates';
  raise notice 'Ensure "Confirm Signup" template is enabled';
end $$;

-- Note: We can't directly check auth.audit_log_entries in newer Supabase versions
do $$
begin
  raise notice 'Email Audit Log: Cannot directly check (access restricted)';
  raise notice 'Please check in Supabase Dashboard: Authentication -> Logs';
end $$;

-- Summary and recommendations
do $$
begin
  -- Report findings
  raise notice E'\nEmail Configuration Status:\n-------------------------';
  raise notice 'Email Provider: Check in Supabase Dashboard';
  raise notice 'Site URL: Check in Supabase Dashboard';
  raise notice 'Pending Verifications: Check in Supabase Dashboard';
  
  -- Recommendations
  raise notice E'\nRecommendations:\n----------------';
  raise notice '- Ensure email provider is enabled in Authentication -> Providers -> Email';
  raise notice '- Configure Site URL to http://localhost:3000 in Authentication -> URL Configuration';
  raise notice '- Add http://localhost:3000/* to Redirect URLs in Authentication -> URL Configuration';
  raise notice '- Verify "Confirm Signup" template is enabled in Authentication -> Email Templates';
  raise notice '- Check spam folders for any pending verification emails';
  raise notice '- Consider testing with a different email provider if issues persist';
end $$;
