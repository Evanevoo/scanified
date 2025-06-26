-- Add last_location_update column to bottles table for daily update tracking
-- This column helps prevent duplicate updates on the same day

ALTER TABLE bottles 
ADD COLUMN IF NOT EXISTS last_location_update DATE;

-- Add comment to explain the column
COMMENT ON COLUMN bottles.last_location_update IS 'Date of last daily update to prevent duplicate increments';

-- Create index for better performance on daily updates
CREATE INDEX IF NOT EXISTS idx_bottles_last_location_update 
ON bottles(last_location_update);

-- Update existing bottles to have today's date as last_location_update
-- This ensures they get updated on the next daily run
UPDATE bottles 
SET last_location_update = CURRENT_DATE 
WHERE last_location_update IS NULL; 