-- Add remaining notification preference toggles to firms table
ALTER TABLE firms
  ADD COLUMN IF NOT EXISTS notify_auto_dormant      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_dormant_reminder  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_upload_attempt    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_weekly_report     boolean NOT NULL DEFAULT false;
