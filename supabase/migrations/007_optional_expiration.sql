-- Make expires_at optional so posts can live forever unless the author chooses a timer
ALTER TABLE posts ALTER COLUMN expires_at DROP NOT NULL;

-- Make all existing posts permanent (removes old 48h expiration so they reappear in the feed)
UPDATE posts SET expires_at = NULL;
