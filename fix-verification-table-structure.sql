-- Fix organization_verifications table structure
-- This adds missing columns if they don't exist

-- Check if table exists, if not create it
CREATE TABLE IF NOT EXISTS organization_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    organization_name TEXT NOT NULL,
    user_name TEXT NOT NULL,
    verification_token TEXT UNIQUE NOT NULL,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add verified column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organization_verifications' 
        AND column_name = 'verified'
    ) THEN
        ALTER TABLE organization_verifications 
        ADD COLUMN verified BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added verified column';
    ELSE
        RAISE NOTICE '✅ verified column already exists';
    END IF;

    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organization_verifications' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE organization_verifications 
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Added created_at column';
    ELSE
        RAISE NOTICE '✅ created_at column already exists';
    END IF;

    -- Add user_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organization_verifications' 
        AND column_name = 'user_name'
    ) THEN
        ALTER TABLE organization_verifications 
        ADD COLUMN user_name TEXT;
        RAISE NOTICE '✅ Added user_name column';
    ELSE
        RAISE NOTICE '✅ user_name column already exists';
    END IF;

    -- Add organization_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organization_verifications' 
        AND column_name = 'organization_name'
    ) THEN
        ALTER TABLE organization_verifications 
        ADD COLUMN organization_name TEXT;
        RAISE NOTICE '✅ Added organization_name column';
    ELSE
        RAISE NOTICE '✅ organization_name column already exists';
    END IF;

    -- Add email column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organization_verifications' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE organization_verifications 
        ADD COLUMN email TEXT;
        RAISE NOTICE '✅ Added email column';
    ELSE
        RAISE NOTICE '✅ email column already exists';
    END IF;

    -- Add verification_token column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organization_verifications' 
        AND column_name = 'verification_token'
    ) THEN
        ALTER TABLE organization_verifications 
        ADD COLUMN verification_token TEXT UNIQUE;
        RAISE NOTICE '✅ Added verification_token column';
    ELSE
        RAISE NOTICE '✅ verification_token column already exists';
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_organization_verifications_token 
    ON organization_verifications(verification_token);

CREATE INDEX IF NOT EXISTS idx_organization_verifications_email 
    ON organization_verifications(email);

-- Ensure verified has a default value for existing rows
UPDATE organization_verifications 
SET verified = false 
WHERE verified IS NULL;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Table structure fixed!';
    RAISE NOTICE '   All required columns should now exist';
END $$;

