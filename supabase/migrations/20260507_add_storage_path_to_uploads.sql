-- Add storage_path to uploads table
-- Required for inbound email attachments stored in Supabase Storage

ALTER TABLE uploads
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Index for faster lookups by storage path
CREATE INDEX IF NOT EXISTS idx_uploads_storage_path
ON uploads(storage_path)
WHERE storage_path IS NOT NULL;
