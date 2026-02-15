-- ============================================================
-- Spill — Initial Database Schema
-- ============================================================

-- ---------- universities ----------
CREATE TABLE universities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email_domain TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ---------- users (extends auth.users) ----------
CREATE TABLE users (
  id              UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  university_id   UUID NOT NULL REFERENCES universities ON DELETE RESTRICT,
  email           TEXT UNIQUE NOT NULL,
  email_verified  BOOLEAN DEFAULT false,
  handle          TEXT UNIQUE NOT NULL,
  display_name    TEXT,
  role            TEXT CHECK (role IN ('user', 'moderator', 'admin')) DEFAULT 'user',
  status          TEXT CHECK (status IN ('active', 'suspended', 'deleted')) DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT now(),
  last_active_at  TIMESTAMPTZ DEFAULT now()
);

-- ---------- posts ----------
CREATE TABLE posts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id     UUID NOT NULL REFERENCES universities ON DELETE RESTRICT,
  author_user_id    UUID NOT NULL REFERENCES users ON DELETE CASCADE,
  target_user_id    UUID NOT NULL REFERENCES users ON DELETE CASCADE,
  body              TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at        TIMESTAMPTZ DEFAULT now(),
  expires_at        TIMESTAMPTZ NOT NULL,
  status            TEXT CHECK (status IN ('active', 'expired', 'removed')) DEFAULT 'active',
  removed_at        TIMESTAMPTZ,
  removed_by        UUID REFERENCES users ON DELETE SET NULL,
  removal_reason    TEXT,
  like_count        INTEGER DEFAULT 0,
  comment_count     INTEGER DEFAULT 0,
  UNIQUE (author_user_id, target_user_id)
);

-- ---------- comments ----------
CREATE TABLE comments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id           UUID NOT NULL REFERENCES posts ON DELETE CASCADE,
  university_id     UUID NOT NULL REFERENCES universities ON DELETE RESTRICT,
  author_user_id    UUID NOT NULL REFERENCES users ON DELETE CASCADE,
  body              TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 300),
  created_at        TIMESTAMPTZ DEFAULT now(),
  status            TEXT CHECK (status IN ('active', 'removed')) DEFAULT 'active',
  removed_at        TIMESTAMPTZ,
  removed_by        UUID REFERENCES users ON DELETE SET NULL,
  removal_reason    TEXT,
  parent_comment_id UUID REFERENCES comments ON DELETE CASCADE
);

-- ---------- likes ----------
CREATE TABLE likes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES posts ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (post_id, user_id)
);

-- ---------- reports ----------
CREATE TABLE reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id  UUID NOT NULL REFERENCES users ON DELETE CASCADE,
  entity_type       TEXT NOT NULL CHECK (entity_type IN ('post', 'comment', 'user')),
  entity_id         UUID NOT NULL,
  reason            TEXT NOT NULL,
  details           TEXT,
  status            TEXT CHECK (status IN ('open', 'reviewed', 'dismissed')) DEFAULT 'open',
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ---------- moderation_actions ----------
CREATE TABLE moderation_actions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_user_id   UUID NOT NULL REFERENCES users ON DELETE CASCADE,
  action_type         TEXT NOT NULL CHECK (action_type IN (
    'remove_post', 'remove_comment', 'suspend_user', 'unsuspend_user', 'dismiss_report'
  )),
  entity_type         TEXT NOT NULL,
  entity_id           UUID NOT NULL,
  reason              TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_posts_uni_status_expires   ON posts (university_id, status, expires_at);
CREATE INDEX idx_posts_target_status_created ON posts (target_user_id, status, created_at DESC);
CREATE INDEX idx_posts_uni_status_created   ON posts (university_id, status, created_at DESC);

CREATE INDEX idx_comments_post_status_created ON comments (post_id, status, created_at ASC);
CREATE INDEX idx_comments_uni_status_created  ON comments (university_id, status, created_at DESC);

CREATE INDEX idx_users_handle        ON users (handle);
CREATE INDEX idx_users_university_id ON users (university_id);


-- ============================================================
-- Row-Level Security
-- ============================================================

ALTER TABLE universities      ENABLE ROW LEVEL SECURITY;
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports            ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;

-- Helper: get the current user's university_id
CREATE OR REPLACE FUNCTION public.current_user_university_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT university_id FROM public.users WHERE id = auth.uid();
$$;

-- ---------- universities ----------
CREATE POLICY "Anyone authenticated can read universities"
  ON universities FOR SELECT
  TO authenticated
  USING (true);

-- ---------- users ----------
CREATE POLICY "Users can read profiles in their university"
  ON users FOR SELECT
  TO authenticated
  USING (university_id = public.current_user_university_id());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---------- posts ----------
CREATE POLICY "Users can read posts in their university"
  ON posts FOR SELECT
  TO authenticated
  USING (university_id = public.current_user_university_id());

CREATE POLICY "Users can insert posts in their university"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (
    university_id = public.current_user_university_id()
    AND author_user_id = auth.uid()
  );

-- ---------- comments ----------
CREATE POLICY "Users can read comments in their university"
  ON comments FOR SELECT
  TO authenticated
  USING (university_id = public.current_user_university_id());

CREATE POLICY "Users can insert comments in their university"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    university_id = public.current_user_university_id()
    AND author_user_id = auth.uid()
  );

-- ---------- likes ----------
CREATE POLICY "Users can read likes on posts in their university"
  ON likes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = likes.post_id
        AND posts.university_id = public.current_user_university_id()
    )
  );

CREATE POLICY "Users can insert their own likes"
  ON likes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = likes.post_id
        AND posts.university_id = public.current_user_university_id()
    )
  );

CREATE POLICY "Users can delete their own likes"
  ON likes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ---------- reports ----------
CREATE POLICY "Users can insert reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_user_id = auth.uid());

CREATE POLICY "Moderators can read reports in their university"
  ON reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('moderator', 'admin')
        AND users.university_id = public.current_user_university_id()
    )
  );

-- ---------- moderation_actions ----------
CREATE POLICY "Moderators can read moderation actions"
  ON moderation_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('moderator', 'admin')
    )
  );

CREATE POLICY "Moderators can insert moderation actions"
  ON moderation_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    moderator_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('moderator', 'admin')
    )
  );


-- ============================================================
-- Seed Data
-- ============================================================

INSERT INTO universities (name, email_domain) VALUES
  ('University of Minnesota', 'umn.edu'),
  ('Test University',         'test.edu');
