-- Simple verification check
do $$
declare 
  v_test_user json;
  v_error_message text;
begin
  raise notice E'\nVerifying Email Configuration\n---------------------------';
  
  -- Try creating a test user
  begin
    with test_user as (
      select 
        gen_random_uuid() as id,
        'test_' || gen_random_uuid() || '@example.com' as email
    )
    select row_to_json(test_user.*) into v_test_user
    from test_user;

    raise notice 'Test email: %', v_test_user->>'email';
    raise notice 'Test user ID: %', v_test_user->>'id';

    -- Important! Don't actually create the user, just show configuration steps
    raise notice E'\nConfiguration Steps:\n------------------';
    raise notice '1. Open Supabase Dashboard';
    raise notice '2. Go to Authentication -> Providers';
    raise notice '3. Enable Email provider';
    raise notice '4. Go to Authentication -> Email Templates';
    raise notice '5. Verify "Confirm Signup" template is enabled';
    raise notice E'\nURL Configuration:\n-----------------';
    raise notice '6. Go to Authentication -> URL Configuration';
    raise notice '7. Set Site URL to: http://localhost:3000';
    raise notice '8. Add to Redirect URLs: http://localhost:3000/*';
    
    raise notice E'\nTesting Steps:\n--------------';
    raise notice '1. Clear browser cookies and storage';
    raise notice '2. Restart the development server';
    raise notice '3. Try registering with a real email address';
    raise notice '4. Check spam folder if email not received';
    raise notice '5. Look for debug information in browser console';

  exception when others then
    v_error_message := SQLERRM;
    raise notice 'Error in verification: %', v_error_message;
  end;

end $$;
