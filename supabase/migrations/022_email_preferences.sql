-- Add email notification preferences and cooldown tracking to users table
ALTER TABLE users
  ADD COLUMN email_notify_posts    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN email_notify_comments BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN email_notify_mentions BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN last_email_sent_at    TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN email_unsubscribe_token UUID DEFAULT gen_random_uuid();

-- Index for token-based unsubscribe lookups
CREATE UNIQUE INDEX idx_users_unsubscribe_token ON users (email_unsubscribe_token);
