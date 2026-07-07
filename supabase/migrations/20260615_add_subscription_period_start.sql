-- Add current_period_start to subscriptions table
-- Tracks when the current billing period began — different from created_at when
-- a trial precedes the first paid period (trial end date becomes the anchor).
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz;
