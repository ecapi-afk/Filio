-- Notifications table for the firm notification center (bell icon in header)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_firm_id_idx ON notifications(firm_id);
CREATE INDEX IF NOT EXISTS notifications_firm_unread_idx ON notifications(firm_id) WHERE read_at IS NULL;

-- RLS: firm members can only see their firm's notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "firm_members_read_notifications"
  ON notifications FOR SELECT
  USING (
    firm_id IN (
      SELECT firm_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "firm_members_update_notifications"
  ON notifications FOR UPDATE
  USING (
    firm_id IN (
      SELECT firm_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Service role (admin client) can insert from webhooks/crons without RLS
