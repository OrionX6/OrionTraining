-- =============================================================================
-- NUCLEAR OPTION FIX - Completely rebuilds RLS policies to avoid recursion
-- =============================================================================

-- Start transaction
BEGIN;

-- =============================================================================
-- PART 1: DROP ALL EXISTING POLICIES
-- =============================================================================

-- Drop all policies on profiles table
DO $$
DECLARE
    policy_name text;
BEGIN
    FOR policy_name IN (
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'profiles'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', policy_name);
    END LOOP;
END $$;

-- Drop all policies on organizations table
DO $$
DECLARE
    policy_name text;
BEGIN
    FOR policy_name IN (
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'organizations'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organizations', policy_name);
    END LOOP;
END $$;

-- Drop all policies on regions table
DO $$
DECLARE
    policy_name text;
BEGIN
    FOR policy_name IN (
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'regions'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON regions', policy_name);
    END LOOP;
END $$;

-- Drop all policies on region_admins table
DO $$
DECLARE
    policy_name text;
BEGIN
    FOR policy_name IN (
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'region_admins'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON region_admins', policy_name);
    END LOOP;
END $$;

-- =============================================================================
-- PART 2: CREATE HELPER FUNCTIONS THAT BYPASS RLS
-- =============================================================================

-- Function to check if the current user is a service role
CREATE OR REPLACE FUNCTION is_service_role()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    current_setting('role', TRUE) = 'rls_restricted' AND
    current_setting('request.jwt.claims', TRUE)::json->>'role' = 'service_role'
  );
END;
$$;

-- Function to get user role without triggering RLS
CREATE OR REPLACE FUNCTION get_user_role_direct(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Direct query that bypasses RLS
  SELECT role::TEXT INTO v_role
  FROM profiles
  WHERE id = p_user_id;

  RETURN v_role;
END;
$$;

-- Function to get user organization without triggering RLS
CREATE OR REPLACE FUNCTION get_user_organization_direct(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Direct query that bypasses RLS
  SELECT organization_id INTO v_org_id
  FROM profiles
  WHERE id = p_user_id;

  RETURN v_org_id;
END;
$$;

-- Function to get user region without triggering RLS
CREATE OR REPLACE FUNCTION get_user_region_direct(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_region_id UUID;
BEGIN
  -- Direct query that bypasses RLS
  SELECT region_id INTO v_region_id
  FROM profiles
  WHERE id = p_user_id;

  RETURN v_region_id;
END;
$$;

-- Function to check if user is a super admin
CREATE OR REPLACE FUNCTION is_super_admin_direct()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid() AND role = 'super_admin'::user_role
  );
END;
$$;

-- Function to check if user is an organization admin
CREATE OR REPLACE FUNCTION is_org_admin_direct()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid() AND role = 'admin'::user_role
  );
END;
$$;

-- Function to check if user is a region admin
CREATE OR REPLACE FUNCTION is_region_admin_direct(p_region_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM region_admins
    WHERE user_id = auth.uid() AND region_id = p_region_id
  );
END;
$$;

-- =============================================================================
-- PART 3: CREATE SIMPLIFIED NON-RECURSIVE POLICIES
-- =============================================================================

-- Reset RLS on tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE regions DISABLE ROW LEVEL SECURITY;
ALTER TABLE region_admins DISABLE ROW LEVEL SECURITY;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE region_admins ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies

-- Allow service role to do anything
CREATE POLICY "profiles_service_role"
ON profiles
FOR ALL
TO authenticated
USING (is_service_role());

-- Allow users to read their own profile
CREATE POLICY "profiles_read_own"
ON profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Allow users to update their own profile
CREATE POLICY "profiles_update_own"
ON profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Allow super admins to do anything with profiles
CREATE POLICY "profiles_super_admin"
ON profiles
FOR ALL
TO authenticated
USING (is_super_admin_direct());

-- Allow organization admins to manage profiles in their organization
CREATE POLICY "profiles_org_admin"
ON profiles
FOR ALL
TO authenticated
USING (
  is_org_admin_direct() AND
  get_user_organization_direct(auth.uid()) = organization_id
);

-- Allow region admins to manage profiles in their region
CREATE POLICY "profiles_region_admin"
ON profiles
FOR ALL
TO authenticated
USING (
  region_id IS NOT NULL AND
  is_region_admin_direct(region_id)
);

-- Allow users to see other profiles in their organization
CREATE POLICY "profiles_org_read"
ON profiles
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_organization_direct(auth.uid())
);

-- 2. Organizations Policies

-- Allow service role to do anything
CREATE POLICY "organizations_service_role"
ON organizations
FOR ALL
TO authenticated
USING (is_service_role());

-- Allow super admins to do anything with organizations
CREATE POLICY "organizations_super_admin"
ON organizations
FOR ALL
TO authenticated
USING (is_super_admin_direct());

-- Allow organization admins to manage their organization
CREATE POLICY "organizations_org_admin"
ON organizations
FOR ALL
TO authenticated
USING (
  is_org_admin_direct() AND
  id = get_user_organization_direct(auth.uid())
);

-- Allow users to see their organization
CREATE POLICY "organizations_read_own"
ON organizations
FOR SELECT
TO authenticated
USING (
  id = get_user_organization_direct(auth.uid())
);

-- 3. Regions Policies

-- Allow service role to do anything
CREATE POLICY "regions_service_role"
ON regions
FOR ALL
TO authenticated
USING (is_service_role());

-- Allow super admins to do anything with regions
CREATE POLICY "regions_super_admin"
ON regions
FOR ALL
TO authenticated
USING (is_super_admin_direct());

-- Allow organization admins to manage regions in their organization
CREATE POLICY "regions_org_admin"
ON regions
FOR ALL
TO authenticated
USING (
  is_org_admin_direct() AND
  organization_id = get_user_organization_direct(auth.uid())
);

-- Allow region admins to see their region
CREATE POLICY "regions_region_admin"
ON regions
FOR SELECT
TO authenticated
USING (
  id = get_user_region_direct(auth.uid())
);

-- Allow users to see regions in their organization
CREATE POLICY "regions_org_read"
ON regions
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_organization_direct(auth.uid())
);

-- 4. Region Admins Policies

-- Allow service role to do anything
CREATE POLICY "region_admins_service_role"
ON region_admins
FOR ALL
TO authenticated
USING (is_service_role());

-- Allow super admins to do anything with region admins
CREATE POLICY "region_admins_super_admin"
ON region_admins
FOR ALL
TO authenticated
USING (is_super_admin_direct());

-- Allow organization admins to manage region admins in their organization
CREATE POLICY "region_admins_org_admin"
ON region_admins
FOR ALL
TO authenticated
USING (
  is_org_admin_direct() AND
  EXISTS (
    SELECT 1 FROM regions
    WHERE regions.id = region_admins.region_id
    AND regions.organization_id = get_user_organization_direct(auth.uid())
  )
);

-- Allow region admins to see their region admin entry
CREATE POLICY "region_admins_self"
ON region_admins
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- Allow region admins to see other admins in their region
CREATE POLICY "region_admins_region_read"
ON region_admins
FOR SELECT
TO authenticated
USING (
  region_id = get_user_region_direct(auth.uid())
);

-- =============================================================================
-- PART 4: UPDATE CRITICAL FUNCTIONS TO BYPASS RLS
-- =============================================================================

-- Update complete_user_registration function
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

  -- Create profile directly (not using create_user_profile)
  INSERT INTO profiles (
    id,
    email,
    role,
    organization_id,
    force_password_change,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    p_email,
    'admin',
    v_organization_id,
    true,
    now(),
    now()
  );

  -- Return success
  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'email', p_email,
    'organization_name', p_organization_name,
    'organization_id', v_organization_id,
    'role', 'admin',
    'created_at', now()
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

      -- Create profile directly
      INSERT INTO profiles (
        id,
        email,
        role,
        organization_id,
        force_password_change,
        created_at,
        updated_at
      )
      VALUES (
        p_user_id,
        p_email,
        'admin',
        v_existing_org,
        true,
        now(),
        now()
      );

      RETURN json_build_object(
        'success', true,
        'user_id', p_user_id,
        'email', p_email,
        'organization_name', p_organization_name,
        'organization_id', v_existing_org,
        'role', 'admin',
        'created_at', now()
      );
    ELSE
      RAISE EXCEPTION 'Unexpected unique violation: %', SQLERRM;
    END IF;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Registration failed: % %', SQLERRM, SQLSTATE;
END;
$$;

-- Create a simplified create_user_profile function
CREATE OR REPLACE FUNCTION create_user_profile(
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
  IF p_region_id IS NOT NULL AND p_role IN ('primary_admin', 'secondary_admin') THEN
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

-- Update get_user_region_role function
CREATE OR REPLACE FUNCTION get_user_region_role(p_region_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- First check for service role
  IF is_service_role() THEN
    RETURN 'primary';  -- Service role has full access
  END IF;

  -- Check region admin status
  SELECT ra.role INTO v_role
  FROM region_admins ra
  WHERE ra.user_id = auth.uid()
  AND ra.region_id = p_region_id;

  -- Also allow organization admins full access
  IF v_role IS NULL THEN
    SELECT
      CASE
        WHEN p.role = 'super_admin' THEN 'primary'
        WHEN p.role = 'admin' AND r.organization_id = p.organization_id THEN 'primary'
        ELSE NULL
      END INTO v_role
    FROM profiles p
    CROSS JOIN regions r
    WHERE p.id = auth.uid()
    AND r.id = p_region_id
    LIMIT 1;
  END IF;

  RETURN v_role;
END;
$$;

-- =============================================================================
-- PART 5: ADD PERFORMANCE INDEXES
-- =============================================================================

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS profiles_auth_lookup_idx ON profiles (id, role);
CREATE INDEX IF NOT EXISTS profiles_org_lookup_idx ON profiles (organization_id);
CREATE INDEX IF NOT EXISTS profiles_region_lookup_idx ON profiles (region_id);
CREATE INDEX IF NOT EXISTS region_admins_user_lookup_idx ON region_admins (user_id, region_id);
CREATE INDEX IF NOT EXISTS regions_org_lookup_idx ON regions (organization_id);

-- =============================================================================
-- PART 6: GRANT PERMISSIONS
-- =============================================================================

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_service_role() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role_direct(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_organization_direct(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_region_direct(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin_direct() TO authenticated;
GRANT EXECUTE ON FUNCTION is_org_admin_direct() TO authenticated;
GRANT EXECUTE ON FUNCTION is_region_admin_direct(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_user_registration(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile(UUID, TEXT, TEXT, UUID, TEXT, TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_region_role(UUID) TO authenticated;

-- =============================================================================
-- PART 7: VERIFY SETUP
-- =============================================================================

-- Verify policies
DO $$
BEGIN
  RAISE NOTICE 'Verifying policies...';
END $$;

-- Display policies for verification
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'organizations', 'regions', 'region_admins')
ORDER BY tablename, policyname;

COMMIT;
