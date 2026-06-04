-- Add portal welcome message to firms table (brand_color and logo_url already exist)
ALTER TABLE firms
  ADD COLUMN IF NOT EXISTS portal_welcome_message text;
