-- Add current_period_end to subscriptions table
-- Tracks when the current billing period ends (used for trial/plan display)
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;
