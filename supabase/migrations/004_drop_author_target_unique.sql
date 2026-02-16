-- Drop the unique constraint on (author_user_id, target_user_id)
-- to allow users to post about the same target again after a 30-minute cooldown.
-- The cooldown is enforced in the application layer.
ALTER TABLE posts DROP CONSTRAINT posts_author_user_id_target_user_id_key;
