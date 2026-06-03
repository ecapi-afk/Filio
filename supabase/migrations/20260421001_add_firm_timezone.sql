-- Add timezone field to firms table
ALTER TABLE firms
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/London' NOT NULL;

COMMENT ON COLUMN firms.timezone IS 'IANA timezone identifier (e.g., Europe/London, America/New_York, Asia/Shanghai)';
