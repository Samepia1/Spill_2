-- Add comment_id to notifications for scroll-to-comment on mention notifications
ALTER TABLE notifications ADD COLUMN comment_id UUID REFERENCES comments ON DELETE CASCADE;

-- Index for comment-based notification lookups
CREATE INDEX idx_notifications_comment ON notifications (comment_id) WHERE comment_id IS NOT NULL;
