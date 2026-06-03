-- Add xero_phone column to clients table
-- Stores the phone number retrieved from Xero contact (DEFAULT or MOBILE type)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS xero_phone text;
