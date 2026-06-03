-- Add monthly_uploads_cache JSONB field to firms
ALTER TABLE firms ADD COLUMN IF NOT EXISTS monthly_uploads_cache JSONB DEFAULT '{}'::jsonb;

-- Create function to update cache
CREATE OR REPLACE FUNCTION trigger_update_firm_monthly_uploads()
RETURNS TRIGGER AS $$
DECLARE
  v_firm_id UUID;
  v_timezone TEXT;
  v_month_key TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT firm_id INTO v_firm_id FROM clients WHERE id = NEW.client_id;
    SELECT timezone INTO v_timezone FROM firms WHERE id = v_firm_id;
    IF v_timezone IS NULL THEN v_timezone := 'Europe/London'; END IF;
    v_month_key := to_char(NEW.uploaded_at AT TIME ZONE v_timezone, 'YYYY-MM');
    
    UPDATE firms 
    SET monthly_uploads_cache = jsonb_set(
      monthly_uploads_cache, 
      array[v_month_key], 
      (COALESCE((monthly_uploads_cache->>v_month_key)::int, 0) + 1)::text::jsonb,
      true
    )
    WHERE id = v_firm_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    SELECT firm_id INTO v_firm_id FROM clients WHERE id = OLD.client_id;
    SELECT timezone INTO v_timezone FROM firms WHERE id = v_firm_id;
    IF v_timezone IS NULL THEN v_timezone := 'Europe/London'; END IF;
    v_month_key := to_char(OLD.uploaded_at AT TIME ZONE v_timezone, 'YYYY-MM');
    
    UPDATE firms 
    SET monthly_uploads_cache = jsonb_set(
      monthly_uploads_cache, 
      array[v_month_key], 
      GREATEST((COALESCE((monthly_uploads_cache->>v_month_key)::int, 0) - 1), 0)::text::jsonb,
      true
    )
    WHERE id = v_firm_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_firm_monthly_uploads_trigger ON uploads;
CREATE TRIGGER update_firm_monthly_uploads_trigger
AFTER INSERT OR DELETE ON uploads
FOR EACH ROW
EXECUTE FUNCTION trigger_update_firm_monthly_uploads();

-- Populate existing data
DO $$
DECLARE
  f RECORD;
  u RECORD;
  v_cache JSONB;
BEGIN
  FOR f IN SELECT id, timezone FROM firms LOOP
    v_cache := '{}'::jsonb;
    FOR u IN (
      SELECT 
        to_char(up.uploaded_at AT TIME ZONE COALESCE(f.timezone, 'Europe/London'), 'YYYY-MM') as mkey,
        count(*) as cnt
      FROM uploads up
      JOIN clients c ON c.id = up.client_id
      WHERE c.firm_id = f.id
      GROUP BY 1
    ) LOOP
      v_cache := jsonb_set(v_cache, array[u.mkey], u.cnt::text::jsonb, true);
    END LOOP;
    
    UPDATE firms SET monthly_uploads_cache = v_cache WHERE id = f.id;
  END LOOP;
END;
$$;
