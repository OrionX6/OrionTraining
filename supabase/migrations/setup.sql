-- =============================================================================
-- COMPLETE DATABASE SETUP
-- =============================================================================
-- This script provides a comprehensive setup for the database.
-- It includes all tables, functions, policies, and initial data.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- 2. TYPES AND ENUMS
-- =============================================================================
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'user');

-- =============================================================================
-- 3. TABLES
-- =============================================================================

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  organization_id UUID REFERENCES organizations ON DELETE RESTRICT,
  role user_role NOT NULL DEFAULT 'user',
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  force_password_change BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Quiz categories table
CREATE TABLE quiz_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quizzes table
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES quiz_categories(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  passing_score NUMERIC NOT NULL DEFAULT 70,
  time_limit INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_passing_score CHECK (passing_score >= 0 AND passing_score <= 100),
  CONSTRAINT valid_time_limit CHECK (time_limit IS NULL OR time_limit > 0)
);

-- Questions table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  choices TEXT[] NOT NULL,
  correct_answer INTEGER NOT NULL,
  explanation TEXT,
  points INTEGER NOT NULL DEFAULT 1,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT has_choices CHECK (array_length(choices, 1) > 0),
  CONSTRAINT valid_correct_answer CHECK (correct_answer >= 0),
  CONSTRAINT positive_points CHECK (points > 0)
);

-- Quiz attempts table
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL,
  passed BOOLEAN NOT NULL,
  completed_at TIMESTAMPTZ,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_score CHECK (score >= 0 AND score <= 100)
);

-- Study materials table
CREATE TABLE study_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES quiz_categories(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 4. FUNCTIONS
-- =============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
    AND role IN ('admin', 'super_admin')
  );
$$;

-- Function to create user account
CREATE OR REPLACE FUNCTION create_user_account(
  p_email TEXT,
  p_password TEXT,
  p_role user_role,
  p_organization_id UUID,
  p_created_by UUID,
  p_send_email BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
  v_instance_id UUID := '00000000-0000-0000-0000-000000000000';
  v_organization_name TEXT;
  v_email_sent BOOLEAN := FALSE;
BEGIN
  -- Verify the caller is an admin of the organization
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND organization_id = p_organization_id
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized to create users for this organization';
  END IF;

  -- Get organization name for email
  SELECT name INTO v_organization_name FROM organizations WHERE id = p_organization_id;

  -- Create the user in auth.users
  INSERT INTO auth.users (
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
  )
  VALUES (
    v_instance_id,
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    now(),
    now(),
    jsonb_build_object(
      'provider', 'email',
      'providers', array['email']
    ),
    jsonb_build_object(),
    'authenticated',
    'authenticated'
  )
  RETURNING id INTO v_user_id;

  -- Create identity record
  INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_email,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email),
    'email',
    now(),
    now(),
    now()
  );

  -- Create profile for the user
  INSERT INTO profiles (
    id,
    email,
    role,
    organization_id,
    force_password_change,
    created_by
  )
  VALUES (
    v_user_id,
    p_email,
    p_role,
    p_organization_id,
    true,
    p_created_by
  )
  RETURNING * INTO v_profile;

  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'profile', row_to_json(v_profile),
    'email_sent', v_email_sent
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Email already exists';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create user: %', SQLERRM;
END;
$$;

-- Function to check if password change is required
CREATE OR REPLACE FUNCTION check_password_change_required()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND force_password_change = true
  );
END;
$$;

-- Function to update password and clear force_password_change flag
CREATE OR REPLACE FUNCTION complete_password_change(p_new_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate password length
  IF length(p_new_password) < 8 THEN
    RAISE EXCEPTION 'Password must be at least 8 characters long';
  END IF;

  -- Update password in auth.users
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = now(),
      raw_user_meta_data = raw_user_meta_data ||
        jsonb_build_object('password_changed_at', extract(epoch from now()))
  WHERE id = auth.uid();

  -- Clear force_password_change flag
  UPDATE profiles
  SET force_password_change = false
  WHERE id = auth.uid();

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to change password: %', SQLERRM;
END;
$$;

-- Function to create user profile
CREATE OR REPLACE FUNCTION create_user_profile(
  p_user_id UUID,
  p_email TEXT,
  p_role TEXT,
  p_organization_id UUID,
  p_created_by UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- Create profile for the user
  INSERT INTO profiles (
    id,
    email,
    role,
    organization_id,
    force_password_change,
    created_by
  )
  VALUES (
    p_user_id,
    p_email,
    p_role::user_role,
    p_organization_id,
    true,
    p_created_by
  )
  RETURNING * INTO v_profile;

  RETURN json_build_object(
    'success', true,
    'profile', row_to_json(v_profile)
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Profile already exists';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create profile: %', SQLERRM;
END;
$$;

-- Functions for caching user organization and role
CREATE OR REPLACE FUNCTION get_user_organization()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- =============================================================================
-- 5. STORAGE SETUP
-- =============================================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true),
  ('study_materials', 'study_materials', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own avatar files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own avatar files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- =============================================================================
-- 6. TRIGGERS
-- =============================================================================

-- Create triggers for updated_at column
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_categories_updated_at
  BEFORE UPDATE ON quiz_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_attempts_updated_at
  BEFORE UPDATE ON quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_materials_updated_at
  BEFORE UPDATE ON study_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 7. ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_materials ENABLE ROW LEVEL SECURITY;

-- Profile policies
CREATE POLICY "Profile base access"
ON profiles FOR ALL
USING (
  auth.uid() = id
  OR (
    organization_id = get_user_organization()
    AND organization_id IS NOT NULL
  )
  OR (
    get_user_role() = 'admin'
    AND organization_id IS NULL
  )
);

CREATE POLICY "Profile creation"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin profile updates"
ON profiles FOR UPDATE
USING (
  auth.uid() = id
  OR (
    get_user_role() = 'admin'
    AND (
      organization_id = get_user_organization()
      OR (
        organization_id IS NULL
        AND get_user_organization() IS NOT NULL
      )
    )
  )
);

-- Organization policies
CREATE POLICY "Anyone can create organization"
ON organizations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Can update own organization"
ON organizations FOR UPDATE
USING (
  auth.uid() = owner_id
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND organization_id = organizations.id
    AND role = 'admin'
  )
);

CREATE POLICY "Organizations access"
ON organizations FOR ALL
USING (
  auth.role() = 'authenticated'
  AND (
    auth.uid() = owner_id
    OR
    id = get_user_organization()
  )
);

-- Quiz category policies
CREATE POLICY "Quiz categories viewable by authenticated users"
ON quiz_categories FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Quiz categories manageable by organization admins"
ON quiz_categories FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND organization_id = quiz_categories.organization_id
    AND role = 'admin'
  )
);

-- Quiz policies
CREATE POLICY "Quizzes viewable by authenticated users"
ON quizzes FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Quizzes manageable by organization admins"
ON quizzes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND organization_id = quizzes.organization_id
    AND role = 'admin'
  )
);

-- Question policies
CREATE POLICY "Questions viewable by authenticated users"
ON questions FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Questions manageable by organization admins"
ON questions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN quizzes q ON p.organization_id = q
    WHERE p.id = auth.uid()
    AND q.id = questions.quiz_id
    AND p.role = 'admin'
  )
);

-- Quiz attempt policies
CREATE POLICY "Quiz attempts viewable by self"
ON quiz_attempts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Quiz attempts creatable by self"
ON quiz_attempts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Quiz attempts updatable by self"
ON quiz_attempts FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Quiz attempts viewable by organization admins"
ON quiz_attempts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN quizzes q ON p.organization_id = q.organization_id
    WHERE p.id = auth.uid()
    AND q.id = quiz_attempts.quiz_id
    AND p.role = 'admin'
  )
);

-- Study material policies
CREATE POLICY "Study materials viewable by authenticated users"
ON study_materials FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Study materials manageable by organization admins"
ON study_materials FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND organization_id = study_materials.organization_id
    AND role = 'admin'
  )
);

-- =============================================================================
-- 8. GRANTS AND PERMISSIONS
-- =============================================================================

-- Schema usage
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Grant execution rights to helper functions
GRANT EXECUTE ON FUNCTION get_user_organization() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_account(text, text, user_role, uuid, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION check_password_change_required() TO authenticated;
GRANT EXECUTE ON FUNCTION complete_password_change(text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile(uuid, text, text, uuid, uuid) TO authenticated;

-- Grant table permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;

-- Fine-grained profile permissions
REVOKE ALL ON profiles FROM authenticated;
GRANT SELECT(id, email, organization_id, role, first_name, last_name, avatar_url) ON profiles TO authenticated;
GRANT INSERT(id, email, first_name, last_name, avatar_url) ON profiles TO authenticated;
GRANT UPDATE(first_name, last_name, avatar_url) ON profiles TO authenticated;

-- Other table permissions
GRANT SELECT, INSERT, UPDATE ON organizations TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- =============================================================================
-- 9. INDICES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_force_password_change ON profiles(force_password_change);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_key ON profiles(email);

-- =============================================================================
-- 10. INITIAL DATA
-- =============================================================================

-- Insert organizations
INSERT INTO organizations (id, name, owner_id, created_at, updated_at)
VALUES (
  '5adec9e3-4492-490a-9885-8635babfde77',
  'OrionSEO',
  '5ae7dde6-d1e5-4434-bbdb-b88b21e35d50',
  '2025-03-12T16:50:33.658484+00:00',
  '2025-03-12T16:50:33.658484+00:00'
);

-- Insert profiles
INSERT INTO profiles (id, email, organization_id, role, first_name, last_name, avatar_url, created_at, updated_at, force_password_change, created_by)
VALUES
  (
    '5ae7dde6-d1e5-4434-bbdb-b88b21e35d50',
    'nojs2115@yahoo.com',
    '5adec9e3-4492-490a-9885-8635babfde77',
    'admin',
    null,
    null,
    null,
    '2025-03-12T16:50:33.658484+00:00',
    '2025-03-12T16:50:33.658484+00:00',
    false,
    null
  ),
  (
    '8f8d4f14-c494-4384-b90d-4f4cb4abce91',
    'orionx65@gmail.com',
    '5adec9e3-4492-490a-9885-8635babfde77',
    'user',
    'Nathan',
    'User',
    'https://xfpnbgjxrpzzlewblgql.supabase.co/storage/v1/object/public/avatars/8f8d4f14-c494-4384-b90d-4f4cb4abce91/1741802206799.png',
    '2025-03-12T17:55:43.732499+00:00',
    '2025-03-12T17:56:59.917977+00:00',
    false,
    '5ae7dde6-d1e5-4434-bbdb-b88b21e35d50'
  );

COMMIT;
