-- Notifications table
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id   UUID NOT NULL REFERENCES universities ON DELETE RESTRICT,
  recipient_id    UUID NOT NULL REFERENCES users ON DELETE CASCADE,
  actor_id        UUID NOT NULL REFERENCES users ON DELETE CASCADE,
  type            TEXT NOT NULL,
  post_id         UUID NOT NULL REFERENCES posts ON DELETE CASCADE,
  actor_handle    TEXT,
  post_subject    TEXT NOT NULL,
  is_read         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_recipient ON notifications (recipient_id, is_read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "Users can insert notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND university_id = public.current_user_university_id()
  );
