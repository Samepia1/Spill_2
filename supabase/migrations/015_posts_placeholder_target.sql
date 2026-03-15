-- ============================================================
-- Posts: Add placeholder target support
-- Posts can now target either a real user or a placeholder profile.
-- Exactly one must be set (XOR constraint).
-- ============================================================

-- Add placeholder target column
ALTER TABLE posts
  ADD COLUMN target_placeholder_id UUID REFERENCES placeholder_profiles ON DELETE SET NULL;

-- Make target_user_id nullable (was NOT NULL)
ALTER TABLE posts
  ALTER COLUMN target_user_id DROP NOT NULL;

-- XOR constraint: exactly one target must be set
ALTER TABLE posts
  ADD CONSTRAINT posts_target_xor
  CHECK (
    (target_user_id IS NOT NULL AND target_placeholder_id IS NULL)
    OR (target_user_id IS NULL AND target_placeholder_id IS NOT NULL)
  );

-- Index for placeholder-targeted posts
CREATE INDEX idx_posts_target_placeholder ON posts (target_placeholder_id)
  WHERE target_placeholder_id IS NOT NULL;
