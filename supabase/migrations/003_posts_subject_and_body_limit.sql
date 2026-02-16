-- Add subject column (post title, required, max 200 chars)
ALTER TABLE posts ADD COLUMN subject TEXT NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 200);

-- Increase body limit from 500 to 1000 chars
ALTER TABLE posts DROP CONSTRAINT posts_body_check;
ALTER TABLE posts ADD CONSTRAINT posts_body_check CHECK (char_length(body) BETWEEN 1 AND 1000);
