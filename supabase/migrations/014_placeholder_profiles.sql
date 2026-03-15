-- ============================================================
-- Placeholder Profiles
-- Phone-number-based profiles for users who haven't signed up yet.
-- When someone posts about a phone number, a placeholder is created.
-- When that person signs up and verifies their phone, the placeholder
-- is "claimed" and all posts are reassigned to the real user.
-- ============================================================

-- ---------- placeholder_profiles table ----------
CREATE TABLE placeholder_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number        TEXT NOT NULL,
  phone_last_four     TEXT NOT NULL,
  handle              TEXT NOT NULL,
  university_id       UUID NOT NULL REFERENCES universities ON DELETE RESTRICT,
  created_by          UUID NOT NULL REFERENCES users ON DELETE CASCADE,
  claimed_by          UUID REFERENCES users ON DELETE SET NULL,
  claimed_at          TIMESTAMPTZ,
  post_count          INTEGER DEFAULT 0,
  unique_poster_count INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE (phone_number, university_id)
);


-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_placeholder_profiles_university ON placeholder_profiles (university_id);
CREATE INDEX idx_placeholder_profiles_handle     ON placeholder_profiles (handle);
CREATE INDEX idx_placeholder_profiles_phone      ON placeholder_profiles (phone_number);
CREATE INDEX idx_placeholder_profiles_claimed_by ON placeholder_profiles (claimed_by)
  WHERE claimed_by IS NOT NULL;


-- ============================================================
-- Row-Level Security
-- ============================================================

ALTER TABLE placeholder_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read placeholders in their university"
  ON placeholder_profiles FOR SELECT
  TO authenticated
  USING (university_id = public.current_user_university_id());

CREATE POLICY "Users can insert placeholders in their university"
  ON placeholder_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    university_id = public.current_user_university_id()
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update placeholders in their university"
  ON placeholder_profiles FOR UPDATE
  TO authenticated
  USING (university_id = public.current_user_university_id())
  WITH CHECK (university_id = public.current_user_university_id());


-- ============================================================
-- Helper: generate a unique handle for a placeholder profile
-- Tries "phone_XXXX", then "phone_XXXX_1", "phone_XXXX_2", etc.
-- Checks against both placeholder_profiles (same university)
-- and users (globally unique handles).
-- ============================================================

CREATE OR REPLACE FUNCTION generate_placeholder_handle(
  p_phone_last_four TEXT,
  p_university_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  candidate TEXT;
  suffix    INT := 0;
BEGIN
  -- First attempt: "phone_XXXX"
  candidate := 'phone_' || p_phone_last_four;

  LOOP
    -- Check if this handle is taken by any real user (globally unique)
    -- or by another placeholder in the same university
    IF NOT EXISTS (
      SELECT 1 FROM users WHERE handle = candidate
    ) AND NOT EXISTS (
      SELECT 1 FROM placeholder_profiles
      WHERE handle = candidate AND university_id = p_university_id
    ) THEN
      RETURN candidate;
    END IF;

    -- Try next suffix: phone_XXXX_1, phone_XXXX_2, ...
    suffix := suffix + 1;
    candidate := 'phone_' || p_phone_last_four || '_' || suffix;
  END LOOP;
END;
$$;


-- ============================================================
-- Helper: claim a placeholder profile when a real user signs up
-- Reassigns all posts targeting the placeholder to the real user.
-- Returns the number of reassigned posts.
-- SECURITY DEFINER so it can update posts regardless of RLS.
-- ============================================================

CREATE OR REPLACE FUNCTION claim_placeholder_profile(
  p_phone_number TEXT,
  p_user_id UUID,
  p_university_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_placeholder_id UUID;
  v_reassigned     INTEGER;
BEGIN
  -- Find unclaimed placeholder matching phone + university
  SELECT id INTO v_placeholder_id
  FROM placeholder_profiles
  WHERE phone_number = p_phone_number
    AND university_id = p_university_id
    AND claimed_by IS NULL;

  -- No matching placeholder found
  IF v_placeholder_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Reassign all posts targeting this placeholder to the real user
  UPDATE posts
  SET target_user_id = p_user_id,
      target_placeholder_id = NULL
  WHERE target_placeholder_id = v_placeholder_id;

  GET DIAGNOSTICS v_reassigned = ROW_COUNT;

  -- Mark the placeholder as claimed
  UPDATE placeholder_profiles
  SET claimed_by = p_user_id,
      claimed_at = now()
  WHERE id = v_placeholder_id;

  RETURN v_reassigned;
END;
$$;
