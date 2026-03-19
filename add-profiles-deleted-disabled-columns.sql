-- Add deleted_at and disabled_at to profiles (fixes "Could not find the 'deleted_at' column of 'profiles' in the schema cache")
-- Run this in Supabase: SQL Editor → New query → paste and Run

-- Add deleted_at for soft-delete (nullable timestamp)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add disabled_at for account disable (nullable timestamp)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ DEFAULT NULL;

-- Optional: index for filtering active profiles
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_disabled_at ON profiles (disabled_at) WHERE disabled_at IS NULL;
