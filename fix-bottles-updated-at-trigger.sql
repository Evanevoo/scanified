-- Step 1: Check if updated_at column exists in bottles table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'bottles' 
  AND column_name = 'updated_at';

-- Step 2: Check if there's a trigger trying to update updated_at
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'bottles'
  AND trigger_name LIKE '%updated_at%';

-- Step 3: Drop the trigger if it exists (since the column doesn't exist)
-- This is the main fix - run this to resolve the error
DROP TRIGGER IF EXISTS update_bottles_updated_at ON bottles;

-- Step 4: Verify the trigger is gone
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'bottles'
  AND trigger_name LIKE '%updated_at%';
-- Should return no rows if the trigger was successfully dropped

-- Optional: If you want to add the column and trigger instead:
-- ALTER TABLE bottles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
-- 
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--    NEW.updated_at = NOW();
--    RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
--
-- CREATE TRIGGER update_bottles_updated_at 
--   BEFORE UPDATE ON bottles 
--   FOR EACH ROW 
--   EXECUTE FUNCTION update_updated_at_column();
