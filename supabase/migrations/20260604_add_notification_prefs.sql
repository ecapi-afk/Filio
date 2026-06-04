-- Add notification preference toggles to firms table
ALTER TABLE firms
  ADD COLUMN IF NOT EXISTS notify_daily_digest    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_sync_failure    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_client_overdue  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_quota_warning   boolean NOT NULL DEFAULT true;
