-- Add original_filename column to uploads table
-- This stores the original filename before client-side renaming

ALTER TABLE uploads
ADD COLUMN IF NOT EXISTS original_filename TEXT;

-- Backfill existing records: set original_filename = filename for records that don't have it
UPDATE uploads
SET original_filename = filename
WHERE original_filename IS NULL;

-- Add a check constraint to ensure original_filename is never null
ALTER TABLE uploads
ALTER COLUMN original_filename SET NOT NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_uploads_original_filename ON uploads(original_filename);
