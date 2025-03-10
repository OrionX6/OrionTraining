-- Reset existing schema
do $$ 
begin
  -- Drop existing tables if they exist
  drop table if exists profiles cascade;
  drop table if exists organizations cascade;
  
  -- Drop existing types if they exist
  drop type if exists user_role cascade;
  
  -- Drop existing functions if they exist
  drop function if exists create_user_with_organization cascade;
  drop function if exists update_updated_at_column cascade;
  drop function if exists is_admin cascade;
end $$;

-- Create types and enums
create type user_role as enum ('super_admin', 'admin', 'user');

-- Create organizations table
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Add constraints
  constraint name_not_empty check (length(trim(name)) > 0)
);

-- Create profiles table
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null unique,
  organization_id uuid references organizations on delete restrict,
  role user_role not null default 'user',
  first_name text,
  last_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Add constraints
  constraint email_not_empty check (length(trim(email)) > 0),
  constraint valid_email check (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create updated_at trigger function
create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create triggers for updated_at
create trigger update_organizations_updated_at
  before update on organizations
  for each row
  execute function update_updated_at_column();

create trigger update_profiles_updated_at
  before update on profiles
  for each row
  execute function update_updated_at_column();

-- Enable RLS
alter table organizations enable row level security;
alter table profiles enable row level security;

-- Add table comments
comment on table organizations is 'Organizations that users belong to';
comment on table profiles is 'Profile data for each user';

-- Add column comments
comment on column organizations.id is 'Unique identifier for the organization';
comment on column organizations.name is 'Name of the organization';
comment on column organizations.created_at is 'Timestamp when the organization was created';
comment on column organizations.updated_at is 'Timestamp when the organization was last updated';

comment on column profiles.id is 'References auth.users.id';
comment on column profiles.email is 'User''s email address';
comment on column profiles.organization_id is 'References organizations.id';
comment on column profiles.role is 'User''s role within their organization';
comment on column profiles.first_name is 'User''s first name';
comment on column profiles.last_name is 'User''s last name';
comment on column profiles.avatar_url is 'URL to user''s avatar image';
comment on column profiles.created_at is 'Timestamp when the profile was created';
comment on column profiles.updated_at is 'Timestamp when the profile was last updated';
