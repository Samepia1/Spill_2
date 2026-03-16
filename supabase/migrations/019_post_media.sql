-- ============================================================
-- Post Media: photos and videos attached to posts
-- ============================================================

-- 1. Add media_count to posts (used for content-required check)
ALTER TABLE posts ADD COLUMN media_count INT NOT NULL DEFAULT 0;

-- 2. Make subject and body nullable (currently NOT NULL with CHECK constraints)
--    Drop existing CHECK constraints first, then re-add with nullable support
ALTER TABLE posts DROP CONSTRAINT posts_subject_check;
ALTER TABLE posts DROP CONSTRAINT posts_body_check;
ALTER TABLE posts ALTER COLUMN subject DROP NOT NULL;
ALTER TABLE posts ALTER COLUMN body DROP NOT NULL;

-- Re-add length checks that allow NULL
ALTER TABLE posts ADD CONSTRAINT posts_subject_check
  CHECK (subject IS NULL OR char_length(subject) BETWEEN 1 AND 200);
ALTER TABLE posts ADD CONSTRAINT posts_body_check
  CHECK (body IS NULL OR char_length(body) BETWEEN 1 AND 1000);

-- At least one form of content required
ALTER TABLE posts ADD CONSTRAINT posts_content_required
  CHECK (
    (subject IS NOT NULL AND char_length(trim(subject)) > 0)
    OR (body IS NOT NULL AND char_length(trim(body)) > 0)
    OR media_count > 0
  );

-- 3. Create post_media table
CREATE TABLE post_media (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id             UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  university_id       UUID NOT NULL REFERENCES universities(id),
  storage_path        TEXT NOT NULL,
  public_url          TEXT NOT NULL,
  media_type          TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  file_size_bytes     BIGINT NOT NULL,
  mime_type           TEXT NOT NULL,
  width               INT,
  height              INT,
  thumbnail_url       TEXT,
  display_order       SMALLINT NOT NULL DEFAULT 0,
  moderation_status   TEXT NOT NULL DEFAULT 'pending'
    CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  moderation_checked_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_post_media_post_id ON post_media(post_id);
CREATE INDEX idx_post_media_moderation ON post_media(moderation_status)
  WHERE moderation_status = 'pending';

-- 4. RLS
ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read university post media"
ON post_media FOR SELECT
TO authenticated
USING (university_id = public.current_user_university_id());

CREATE POLICY "Users can insert own post media"
ON post_media FOR INSERT
TO authenticated
WITH CHECK (university_id = public.current_user_university_id());

CREATE POLICY "Moderators can update post media"
ON post_media FOR UPDATE
TO authenticated
USING (
  university_id = public.current_user_university_id()
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('moderator', 'admin')
    AND university_id = public.current_user_university_id()
  )
);

-- 5. Storage bucket for post media (50MB limit for videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media',
  'post-media',
  true,
  52428800,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
);

-- Storage RLS: users upload to {user_id}/*
CREATE POLICY "Users can upload post media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own post media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'post-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Public post media read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'post-media');

-- 6. Trigger to keep posts.media_count in sync
CREATE OR REPLACE FUNCTION update_post_media_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET media_count = media_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET media_count = media_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_media_count
AFTER INSERT OR DELETE ON post_media
FOR EACH ROW EXECUTE FUNCTION update_post_media_count();
