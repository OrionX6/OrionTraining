-- =============================================================================
-- FIX FUNCTION OVERLOADING ISSUE
-- =============================================================================

-- Start transaction
BEGIN;

-- First, let's check for all versions of the create_user_profile function
DO $$
BEGIN
  RAISE NOTICE 'Checking for existing create_user_profile functions...';
END $$;

SELECT proname, pronargs, proargtypes::regtype[]
FROM pg_proc
WHERE proname = 'create_user_profile'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Drop all versions of the create_user_profile function
DROP FUNCTION IF EXISTS create_user_profile(UUID, TEXT, TEXT, UUID, UUID);
DROP FUNCTION IF EXISTS create_user_profile(UUID, TEXT, TEXT, UUID, TEXT, TEXT, UUID, UUID);
DROP FUNCTION IF EXISTS create_user_profile(UUID, TEXT, user_role, UUID, TEXT, TEXT, UUID, UUID);
DROP FUNCTION IF EXISTS create_user_profile(UUID, TEXT, user_role, UUID, UUID);
DROP FUNCTION IF EXISTS create_user_profile(UUID, TEXT, user_role, UUID);

-- Create a single, unified create_user_profile function with a unique name to avoid conflicts
CREATE OR REPLACE FUNCTION create_user_profile_v2(
  p_user_id UUID,
  p_email TEXT,
  p_role TEXT,
  p_organization_id UUID,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_region_id UUID DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- Create profile directly
  INSERT INTO profiles (
    id,
    email,
    role,
    organization_id,
    first_name,
    last_name,
    region_id,
    force_password_change,
    created_by,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    p_email,
    p_role::user_role,
    p_organization_id,
    p_first_name,
    p_last_name,
    p_region_id,
    true,
    COALESCE(p_created_by, auth.uid()),
    now(),
    now()
  )
  RETURNING * INTO v_profile;

  -- If this is a regional role, set up region_admin entry
  IF p_region_id IS NOT NULL AND (p_role = 'primary_admin' OR p_role = 'secondary_admin') THEN
    INSERT INTO region_admins (
      region_id,
      user_id,
      role,
      created_at,
      updated_at
    ) VALUES (
      p_region_id,
      p_user_id,
      CASE p_role
        WHEN 'primary_admin' THEN 'primary'
        WHEN 'secondary_admin' THEN 'secondary'
        ELSE 'user'
      END,
      now(),
      now()
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'profile', row_to_json(v_profile)
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Profile already exists for %', p_email;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create profile: % %', SQLERRM, SQLSTATE;
END;
$$;

-- Update the complete_user_registration function to use the new create_user_profile_v2 function
CREATE OR REPLACE FUNCTION complete_user_registration(
  p_user_id UUID,
  p_email TEXT,
  p_organization_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_organization_id UUID;
  v_existing_profile UUID;
  v_existing_org UUID;
BEGIN
  -- First check for existing profile
  SELECT id INTO v_existing_profile
  FROM profiles
  WHERE id = p_user_id;

  IF v_existing_profile IS NOT NULL THEN
    -- Return success if profile exists
    RETURN json_build_object(
      'success', true,
      'message', 'Profile already exists',
      'user_id', p_user_id,
      'email', p_email,
      'organization_name', p_organization_name,
      'profile', (
        SELECT row_to_json(p.*)
        FROM profiles p
        WHERE p.id = p_user_id
      )
    );
  END IF;

  -- Check for existing organization
  SELECT id INTO v_existing_org
  FROM organizations
  WHERE owner_id = p_user_id;

  -- If organization exists but profile doesn't, create profile
  IF v_existing_org IS NOT NULL THEN
    v_organization_id := v_existing_org;
  ELSE
    -- Create organization
    INSERT INTO organizations (name, owner_id)
    VALUES (p_organization_name, p_user_id)
    RETURNING id INTO v_organization_id;
  END IF;

  -- Use the new create_user_profile_v2 function
  RETURN create_user_profile_v2(
    p_user_id := p_user_id,
    p_email := p_email,
    p_role := 'admin',
    p_organization_id := v_organization_id
  );
EXCEPTION
  WHEN unique_violation THEN
    -- Handle race conditions
    IF EXISTS (
      SELECT 1 FROM profiles
      WHERE id = p_user_id
    ) THEN
      RETURN json_build_object(
        'success', true,
        'message', 'Profile already exists (race condition)',
        'user_id', p_user_id,
        'email', p_email,
        'organization_name', p_organization_name,
        'profile', (
          SELECT row_to_json(p.*)
          FROM profiles p
          WHERE p.id = p_user_id
        )
      );
    ELSIF EXISTS (
      SELECT 1 FROM organizations
      WHERE owner_id = p_user_id
    ) THEN
      -- Organization exists but profile doesn't - try to create profile
      SELECT id INTO v_existing_org
      FROM organizations
      WHERE owner_id = p_user_id;

      -- Use the new create_user_profile_v2 function
      RETURN create_user_profile_v2(
        p_user_id := p_user_id,
        p_email := p_email,
        p_role := 'admin',
        p_organization_id := v_existing_org
      );
    ELSE
      RAISE EXCEPTION 'Unexpected unique violation: %', SQLERRM;
    END IF;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Registration failed: % %', SQLERRM, SQLSTATE;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_user_profile_v2(UUID, TEXT, TEXT, UUID, TEXT, TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_user_registration(UUID, TEXT, TEXT) TO authenticated;

-- Verify functions
DO $$
BEGIN
  RAISE NOTICE 'Verifying functions...';
END $$;

SELECT proname, pronargs, proargtypes::regtype[]
FROM pg_proc
WHERE proname IN ('create_user_profile_v2', 'complete_user_registration')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

COMMIT;
