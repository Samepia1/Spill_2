-- ============================================================
-- Moderation RLS Policies — UPDATE access for moderators/admins
-- ============================================================

-- Moderators can update report status (open → reviewed/dismissed)
CREATE POLICY "Moderators can update reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('moderator', 'admin')
        AND users.university_id = public.current_user_university_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('moderator', 'admin')
        AND users.university_id = public.current_user_university_id()
    )
  );

-- Moderators can update posts (set status='removed', removed_at, removed_by, removal_reason)
CREATE POLICY "Moderators can update posts in their university"
  ON posts FOR UPDATE
  TO authenticated
  USING (
    university_id = public.current_user_university_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('moderator', 'admin')
    )
  )
  WITH CHECK (
    university_id = public.current_user_university_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('moderator', 'admin')
    )
  );

-- Moderators can update comments (set status='removed', removed_at, removed_by, removal_reason)
CREATE POLICY "Moderators can update comments in their university"
  ON comments FOR UPDATE
  TO authenticated
  USING (
    university_id = public.current_user_university_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('moderator', 'admin')
    )
  )
  WITH CHECK (
    university_id = public.current_user_university_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('moderator', 'admin')
    )
  );

-- Moderators can update users in their university (e.g. suspend)
CREATE POLICY "Moderators can update users in their university"
  ON users FOR UPDATE
  TO authenticated
  USING (
    university_id = public.current_user_university_id()
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('moderator', 'admin')
    )
  )
  WITH CHECK (
    university_id = public.current_user_university_id()
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('moderator', 'admin')
    )
  );
