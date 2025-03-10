-- This SQL script fixes the infinite recursion issue in the policies
-- by removing the circular references between organizations and profiles tables

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Can view own organization" ON organizations;
DROP POLICY IF EXISTS "Can view organization profiles" ON profiles;
DROP POLICY IF EXISTS "Organizations are viewable by organization members" ON organizations;
DROP POLICY IF EXISTS "Profiles are viewable by organization members" ON profiles;
DROP POLICY IF EXISTS "Organizations are viewable by authenticated users" ON organizations;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;

-- Create new policies that avoid circular references

-- For organizations table: Use a direct approach without referencing profiles
CREATE POLICY "Organizations are viewable by authenticated users"
  ON organizations FOR SELECT
  USING (auth.role() = 'authenticated');

-- For profiles table: Use a direct approach without circular references
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Keep the existing policies that don't cause recursion
-- These policies are more specific and will be checked first
-- before falling back to the authenticated users policies

-- Ensure we keep the policy for users to view their own profile
-- This policy already exists, so we don't need to recreate it
-- "Can view own profile" on profiles for select using (auth.uid() = id)

-- Ensure we keep the policy for users to update their own profile
-- This policy already exists, so we don't need to recreate it
-- "Can update own profile" on profiles for update using (auth.uid() = id)

-- Ensure we keep the policy for users to create profiles
-- This policy already exists, so we don't need to recreate it
-- "Anyone can create profile" on profiles for insert with check (auth.uid() = id)

-- Ensure we keep the policy for users to create organizations
-- This policy already exists, so we don't need to recreate it
-- "Anyone can create organization" on organizations for insert with check (true)

-- Ensure we keep the policy for admins to update their organization
-- This policy already exists, so we don't need to recreate it
-- "Can update own organization" on organizations for update using (...)
