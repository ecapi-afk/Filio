-- Admin management fields for firms
-- suspended_at: set when an admin suspends the account; null = active
-- admin_notes: internal-only notes visible only in /filio-control

ALTER TABLE firms
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS admin_notes text DEFAULT NULL;

-- Index for quickly filtering suspended firms in the admin list
CREATE INDEX IF NOT EXISTS firms_suspended_at_idx ON firms (suspended_at)
  WHERE suspended_at IS NOT NULL;
