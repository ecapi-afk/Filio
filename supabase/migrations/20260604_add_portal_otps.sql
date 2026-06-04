-- Portal OTP table for short-code verification
-- Codes are SHA-256 hashed before storage, 6-digit, 10 minute TTL, one-time use

CREATE TABLE IF NOT EXISTS portal_otps (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code      text NOT NULL,          -- references short_links.short_code
  code_hash       text NOT NULL,          -- SHA-256(otp_code)
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  used_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by short_code when verifying
CREATE INDEX IF NOT EXISTS portal_otps_short_code_idx ON portal_otps(short_code);

-- Auto-delete expired/used records after 1 hour (housekeeping)
-- Actual enforcement is in the API (check expires_at and used_at)
