-- Add xero_upload_mode column to uploads table
-- This records which Xero API was used for the upload: 'attachments' or 'files'

ALTER TABLE uploads
ADD COLUMN IF NOT EXISTS xero_upload_mode TEXT;

-- Add index for querying uploads by upload mode
CREATE INDEX IF NOT EXISTS idx_uploads_xero_upload_mode ON uploads(xero_upload_mode);
