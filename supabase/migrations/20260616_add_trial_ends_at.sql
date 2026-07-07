-- Add trial_ends_at to track when a firm's trial expires.
-- For existing trial rows that don't have it yet, default to 30 days from when the row was created.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

UPDATE subscriptions
  SET trial_ends_at = created_at + INTERVAL '30 days'
  WHERE plan = 'trial' AND trial_ends_at IS NULL;
