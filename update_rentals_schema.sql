-- Update rentals table to work with bottles instead of cylinders
-- This script adds a bottle_id column and updates the foreign key relationship

-- Add bottle_id column to rentals table
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS bottle_id UUID;

-- Add foreign key constraint for bottle_id (if bottles table uses UUID)
-- Note: If bottles table uses SERIAL/INTEGER, change UUID to INTEGER below
ALTER TABLE rentals ADD CONSTRAINT IF NOT EXISTS rentals_bottle_id_fkey 
  FOREIGN KEY (bottle_id) REFERENCES bottles(id);

-- Create index on bottle_id for better performance
CREATE INDEX IF NOT EXISTS idx_rentals_bottle_id ON rentals(bottle_id);

-- Note: The cylinder_id column can be kept for backward compatibility
-- or removed later if no longer needed
-- ALTER TABLE rentals DROP COLUMN IF EXISTS cylinder_id;