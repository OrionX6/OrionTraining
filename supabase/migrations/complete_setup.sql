-- =============================================================================
-- TRAINING HUB SAAS - COMPLETE DATABASE SETUP
-- =============================================================================
-- This script provides a comprehensive setup for the Training Hub SaaS database.
-- It can be used to initialize a fresh database or reset an existing one.
--
-- Contents:
--   1. Schema Reset
--   2. Types and Enums
--   3. Tables
--   4. Triggers and Functions
--   5. Row-Level Security Policies
--   6. Permissions and Grants
--   7. Verification Queries
-- =============================================================================

-- Start transaction for safety
BEGIN;

-- =============================================================================
-- 1. SCHEMA RESET
-- =============================================================================
-- Drop all existing objects to ensure a clean slate

DO $$
BEGIN
  -- Drop existing tables if they exist
  DROP TABLE IF EXISTS quiz_attempts CASCADE;
  DROP TABLE IF EXISTS questions CASCADE;
  DROP TABLE IF EXISTS quizzes CASCADE;
  DROP TABLE IF EXISTS study_materials CASCADE;
  DROP TABLE IF EXISTS quiz_categories CASCADE;
  DROP TABLE IF EXISTS profiles CASCADE;
  DROP TABLE IF EXISTS organizations CASCADE;

  -- Drop existing types if they exist
  DROP TYPE IF EXISTS user_role CASCADE;

  -- Drop existing functions if they exist
  DROP FUNCTION IF EXISTS complete_user_registration CASCADE;
  DROP FUNCTION IF EXISTS get_registration_status CASCADE;
  DROP FUNCTION IF EXISTS is_admin CASCADE;
  DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
END $$;

-- =============================================================================
-- 2. TYPES AND ENUMS
-- =============================================================================

-- User role enum
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'user');

-- =============================================================================
-- 3. TABLES
-- =============================================================================

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID, -- References the user who created the organization
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Add constraints
  CONSTRAINT name_not_empty CHECK (length(trim(name)) > 0)
);

COMMENT ON TABLE organizations IS 'Organizations that users belong to';
COMMENT ON COLUMN organizations.id IS 'Unique identifier for the organization';
COMMENT ON COLUMN organizations.name IS 'Name of the organization';
COMMENT ON COLUMN organizations.owner_id IS 'User ID of the organization owner';
COMMENT ON COLUMN organizations.created_at IS 'Timestamp when the organization was created';
COMMENT ON COLUMN organizations.updated_at IS 'Timestamp when the organization was last updated';

-- Profiles table (extends Supabase auth.users)
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

  -- Add constraints
  CONSTRAINT email_not_empty CHECK (length(trim(email)) > 0),
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

COMMENT ON TABLE profiles IS 'Extended profile information for each user';
COMMENT ON COLUMN profiles.id IS 'References auth.users.id';
COMMENT ON COLUMN profiles.email IS 'User''s email address';
COMMENT ON COLUMN profiles.organization_id IS 'Organization the user belongs to';
COMMENT ON COLUMN profiles.role IS 'User''s role within their organization';
COMMENT ON COLUMN profiles.first_name IS 'User''s first name';
COMMENT ON COLUMN profiles.last_name IS 'User''s last name';
COMMENT ON COLUMN profiles.avatar_url IS 'URL to user''s avatar image';
COMMENT ON COLUMN profiles.created_at IS 'Timestamp when the profile was created';
COMMENT ON COLUMN profiles.updated_at IS 'Timestamp when the profile was last updated';

-- Quiz categories table
CREATE TABLE quiz_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT name_not_empty CHECK (length(trim(name)) > 0)
);

COMMENT ON TABLE quiz_categories IS 'Categories for organizing quizzes';
COMMENT ON COLUMN quiz_categories.id IS 'Unique identifier for the category';
COMMENT ON COLUMN quiz_categories.name IS 'Name of the category';
COMMENT ON COLUMN quiz_categories.description IS 'Optional description of the category';
COMMENT ON COLUMN quiz_categories.organization_id IS 'Organization that owns this category';

-- Quizzes table
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES quiz_categories(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  passing_score NUMERIC NOT NULL DEFAULT 70,
  time_limit INTEGER, -- in seconds, NULL means no limit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT valid_passing_score CHECK (passing_score >= 0 AND passing_score <= 100),
  CONSTRAINT valid_time_limit CHECK (time_limit IS NULL OR time_limit > 0)
);

COMMENT ON TABLE quizzes IS 'Quizzes that users can take';
COMMENT ON COLUMN quizzes.id IS 'Unique identifier for the quiz';
COMMENT ON COLUMN quizzes.title IS 'Title of the quiz';
COMMENT ON COLUMN quizzes.description IS 'Optional description of the quiz';
COMMENT ON COLUMN quizzes.category_id IS 'Category this quiz belongs to';
COMMENT ON COLUMN quizzes.organization_id IS 'Organization that owns this quiz';
COMMENT ON COLUMN quizzes.passing_score IS 'Score required to pass the quiz (0-100)';
COMMENT ON COLUMN quizzes.time_limit IS 'Time limit in seconds (NULL = no limit)';

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

  CONSTRAINT question_text_not_empty CHECK (length(trim(question_text)) > 0),
  CONSTRAINT has_choices CHECK (array_length(choices, 1) > 0),
  CONSTRAINT valid_correct_answer CHECK (correct_answer >= 0),
  CONSTRAINT positive_points CHECK (points > 0)
);

COMMENT ON TABLE questions IS 'Questions for quizzes';
COMMENT ON COLUMN questions.id IS 'Unique identifier for the question';
COMMENT ON COLUMN questions.quiz_id IS 'Quiz this question belongs to';
COMMENT ON COLUMN questions.question_text IS 'Text of the question';
COMMENT ON COLUMN questions.choices IS 'Array of possible answers';
COMMENT ON COLUMN questions.correct_answer IS 'Index of the correct answer in the choices array';
COMMENT ON COLUMN questions.explanation IS 'Optional explanation of the answer';
COMMENT ON COLUMN questions.points IS 'Points awarded for a correct answer';
COMMENT ON COLUMN questions."order" IS 'Order of the question within the quiz';

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

COMMENT ON TABLE quiz_attempts IS 'Records of user attempts at quizzes';
COMMENT ON COLUMN quiz_attempts.id IS 'Unique identifier for the attempt';
COMMENT ON COLUMN quiz_attempts.quiz_id IS 'Quiz that was attempted';
COMMENT ON COLUMN quiz_attempts.user_id IS 'User who made the attempt';
COMMENT ON COLUMN quiz_attempts.score IS 'Score achieved (0-100)';
COMMENT ON COLUMN quiz_attempts.passed IS 'Whether the attempt passed the quiz';
COMMENT ON COLUMN quiz_attempts.completed_at IS 'When the attempt was completed (NULL = in progress)';
COMMENT ON COLUMN quiz_attempts.answers IS 'JSON record of answers provided';

-- Study materials table
CREATE TABLE study_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES quiz_categories(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT content_not_empty CHECK (length(trim(content)) > 0)
);

COMMENT ON TABLE study_materials IS 'Study materials for users';
COMMENT ON COLUMN study_materials.id IS 'Unique identifier for the study material';
COMMENT ON COLUMN study_materials.title IS 'Title of the study material';
COMMENT ON COLUMN study_materials.content IS 'Content of the study material';
COMMENT ON COLUMN study_materials.category_id IS 'Category this study material belongs to';
COMMENT ON COLUMN study_materials.organization_id IS 'Organization that owns this study material';
COMMENT ON COLUMN study_materials."order" IS 'Order of the study material within its category';

-- =============================================================================
-- 4. TRIGGERS AND FUNCTIONS
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

COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function to update the updated_at column';

-- Create triggers for updated_at
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

COMMENT ON FUNCTION is_admin(UUID) IS 'Checks if a user has admin privileges';

-- Function to handle registration process
CREATE OR REPLACE FUNCTION complete_user_registration(
  p_user_id UUID,
  p_email TEXT,
  p_organization_name TEXT
)
RETURNS JSON
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_organization_id UUID;
  v_result JSON;
  v_error TEXT;
BEGIN
  -- Start transaction explicitly
  BEGIN
    -- Input validation with specific error messages
    IF p_user_id IS NULL THEN
      v_error := 'User ID is required';
      RAISE EXCEPTION USING message = v_error, errcode = 'RGUSR1';
    END IF;

    IF p_email IS NULL OR p_email = '' THEN
      v_error := 'Email is required';
      RAISE EXCEPTION USING message = v_error, errcode = 'RGUSR2';
    END IF;

    IF p_organization_name IS NULL OR p_organization_name = '' THEN
      v_error := 'Organization name is required';
      RAISE EXCEPTION USING message = v_error, errcode = 'RGUSR3';
    END IF;

    -- Validate email format
    IF NOT p_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      v_error := 'Invalid email format';
      RAISE EXCEPTION USING message = v_error, errcode = 'RGUSR4';
    END IF;

    -- Check if user exists in auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
      v_error := 'User does not exist in auth system';
      RAISE EXCEPTION USING message = v_error, errcode = 'RGUSR5';
    END IF;

    -- Check if user already has a profile
    IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
      v_error := 'Profile already exists for this user';
      RAISE EXCEPTION USING message = v_error, errcode = 'RGUSR6';
    END IF;

    -- Check if email is already in use
    IF EXISTS (SELECT 1 FROM profiles WHERE email = p_email) THEN
      v_error := 'A user with this email already exists';
      RAISE EXCEPTION USING message = v_error, errcode = 'RGUSR7';
    END IF;

    -- Create the organization
    INSERT INTO organizations (name, owner_id)
    VALUES (p_organization_name, p_user_id)
    RETURNING id INTO v_organization_id;

    IF v_organization_id IS NULL THEN
      v_error := 'Failed to create organization';
      RAISE EXCEPTION USING message = v_error, errcode = 'RGUSR8';
    END IF;

    -- Create the profile
    INSERT INTO profiles (
      id,
      email,
      organization_id,
      role,
      created_at,
      updated_at
    )
    VALUES (
      p_user_id,
      p_email,
      v_organization_id,
      'admin',
      now(),
      now()
    );

    -- Return the result
    SELECT json_build_object(
      'user_id', p_user_id,
      'organization_id', v_organization_id,
      'email', p_email,
      'organization_name', p_organization_name,
      'role', 'admin',
      'created_at', now(),
      'status', 'success'
    ) INTO v_result;

    RETURN v_result;

  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback will be automatic on exception
      -- Add error context to the message
      v_error := CASE
        WHEN SQLERRM LIKE '%profiles_email_key%' THEN 'A user with this email already exists'
        WHEN SQLERRM LIKE '%profiles_pkey%' THEN 'Profile already exists for this user'
        WHEN SQLERRM LIKE '%auth.users%' THEN 'User does not exist in auth system'
        ELSE 'Registration failed: ' || SQLERRM
      END;

      RAISE EXCEPTION '%', v_error;
  END;
END;
$$;

COMMENT ON FUNCTION complete_user_registration(UUID, TEXT, TEXT) IS 'Handles the user registration process, creating a profile and organization';

-- Function for checking registration status
CREATE OR REPLACE FUNCTION get_registration_status(p_user_id UUID)
RETURNS JSON
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'has_profile', EXISTS(SELECT 1 FROM profiles WHERE id = p_user_id),
    'is_admin', is_admin(p_user_id),
    'profile', (SELECT row_to_json(p) FROM (
      SELECT p.*, o.name AS organization_name
      FROM profiles p
      LEFT JOIN organizations o ON o.id = p.organization_id
      WHERE p.id = p_user_id
    ) p)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_registration_status(UUID) IS 'Returns the registration status for a user';

-- =============================================================================
-- 5. ROW-LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_materials ENABLE ROW LEVEL SECURITY;

-- Profile policies
CREATE POLICY "Can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Anyone can create profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles viewable by authenticated users"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Organization policies
CREATE POLICY "Anyone can create organization"
  ON organizations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Can update own organization"
  ON organizations FOR UPDATE
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND organization_id = organizations.id
      AND role = 'admin'
    )
  );

CREATE POLICY "Organizations viewable by authenticated users"
  ON organizations FOR SELECT
  USING (auth.role() = 'authenticated');

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
      JOIN quizzes q ON p.organization_id = q.organization_id
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
-- 6. PERMISSIONS AND GRANTS
-- =============================================================================

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Grant table permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION complete_user_registration(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_registration_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;

-- =============================================================================
-- 7. VERIFICATION QUERIES
-- =============================================================================

-- Verify tables were created
SELECT
  table_name,
  table_type
FROM
  information_schema.tables
WHERE
  table_schema = 'public' AND
  table_type = 'BASE TABLE'
ORDER BY
  table_name;

-- Verify RLS is enabled
SELECT
  tablename,
  rowsecurity
FROM
  pg_tables
WHERE
  schemaname = 'public'
ORDER BY
  tablename;

-- Verify policies
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM
  pg_policies
WHERE
  schemaname = 'public'
ORDER BY
  tablename,
  policyname;

-- Verify functions
SELECT
  routine_name,
  data_type
FROM
  information_schema.routines
WHERE
  routine_schema = 'public' AND
  routine_type = 'FUNCTION'
ORDER BY
  routine_name;

-- Verify grants
SELECT
  table_name,
  grantee,
  privilege_type
FROM
  information_schema.table_privileges
WHERE
  table_schema = 'public' AND
  grantee = 'authenticated'
ORDER BY
  table_name,
  privilege_type;

-- Commit the transaction
COMMIT;
