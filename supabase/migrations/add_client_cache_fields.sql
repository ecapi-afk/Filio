-- ============================================================
-- Filio: Client Cache Fields Migration (Fixed)
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- Step 1: Add 5 cached columns to clients table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS client_number        SERIAL,
  ADD COLUMN IF NOT EXISTS next_deadline_date   DATE,
  ADD COLUMN IF NOT EXISTS next_deadline_type   TEXT,
  ADD COLUMN IF NOT EXISTS uploads_count        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS computed_health_status TEXT NOT NULL DEFAULT 'No Action';

-- Step 2: Unique index for client_number (short URL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_client_number
  ON clients(client_number);

-- Step 3: Primary performance indexes on clients
CREATE INDEX IF NOT EXISTS idx_clients_firm_deadline
  ON clients(firm_id, next_deadline_date ASC NULLS LAST)
  WHERE management_status != 'deleted';

CREATE INDEX IF NOT EXISTS idx_clients_firm_health
  ON clients(firm_id, computed_health_status)
  WHERE management_status != 'deleted';

CREATE INDEX IF NOT EXISTS idx_clients_firm_id
  ON clients(firm_id);

-- Step 4: FK indexes on related tables
CREATE INDEX IF NOT EXISTS idx_requests_client_id
  ON requests(client_id);

CREATE INDEX IF NOT EXISTS idx_requests_client_deadline
  ON requests(client_id, deadline_date ASC);

CREATE INDEX IF NOT EXISTS idx_uploads_client_id
  ON uploads(client_id);

CREATE INDEX IF NOT EXISTS idx_uploads_client_uploaded
  ON uploads(client_id, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_reminder_jobs_client_id
  ON reminder_jobs(client_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_client_id
  ON audit_logs(client_id);

-- Step 5: Migrate existing data

-- Populate uploads_count
UPDATE clients c
SET uploads_count = (
  SELECT COUNT(*) FROM uploads u WHERE u.client_id = c.id
);

-- Populate next_deadline_date / next_deadline_type
-- (soonest pending request per client)
UPDATE clients c
SET
  next_deadline_date = sub.deadline_date,
  next_deadline_type = sub.title
FROM (
  SELECT DISTINCT ON (client_id)
    client_id,
    deadline_date,
    title
  FROM requests
  WHERE status != 'Complete'
    AND deadline_date >= CURRENT_DATE
  ORDER BY client_id, deadline_date ASC
) sub
WHERE c.id = sub.client_id;

-- Populate computed_health_status (layered updates)

-- 1. Default: No Action
UPDATE clients SET computed_health_status = 'No Action';

-- 2. Complete (manually marked)
UPDATE clients
SET computed_health_status = 'Complete'
WHERE current_period_completed = true;

-- 3. Overdue
UPDATE clients c
SET computed_health_status = 'Overdue'
WHERE current_period_completed = false
  AND EXISTS (
    SELECT 1 FROM requests r
    WHERE r.client_id = c.id
      AND r.status != 'Complete'
      AND r.deadline_date < CURRENT_DATE
  );

-- 4. Due Soon (within 14 days, not overdue)
UPDATE clients c
SET computed_health_status = 'Due Soon'
WHERE current_period_completed = false
  AND computed_health_status NOT IN ('Overdue', 'Complete')
  AND EXISTS (
    SELECT 1 FROM requests r
    WHERE r.client_id = c.id
      AND r.status != 'Complete'
      AND r.deadline_date >= CURRENT_DATE
      AND r.deadline_date <= CURRENT_DATE + INTERVAL '14 days'
  );

-- 5. Not Started (15-30 days, no uploads)
UPDATE clients c
SET computed_health_status = 'Not Started'
WHERE current_period_completed = false
  AND computed_health_status NOT IN ('Overdue', 'Due Soon', 'Complete')
  AND uploads_count = 0
  AND EXISTS (
    SELECT 1 FROM requests r
    WHERE r.client_id = c.id
      AND r.status != 'Complete'
      AND r.deadline_date >= CURRENT_DATE
      AND r.deadline_date <= CURRENT_DATE + INTERVAL '30 days'
  );

-- 6. In Progress (has uploads, pending requests)
UPDATE clients c
SET computed_health_status = 'In Progress'
WHERE current_period_completed = false
  AND computed_health_status NOT IN ('Overdue', 'Due Soon', 'Not Started', 'Complete')
  AND uploads_count > 0
  AND EXISTS (
    SELECT 1 FROM requests r
    WHERE r.client_id = c.id
      AND r.status != 'Complete'
      AND r.deadline_date >= CURRENT_DATE
  );

-- Verify results
SELECT
  computed_health_status,
  COUNT(*) AS count
FROM clients
GROUP BY computed_health_status
ORDER BY count DESC;
