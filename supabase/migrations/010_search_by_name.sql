-- Allow searching users by handle OR display name
CREATE OR REPLACE FUNCTION search_users_by_activity(
  search_query TEXT DEFAULT '',
  result_limit INT DEFAULT 20,
  result_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  handle TEXT,
  display_name TEXT,
  activity BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    u.id,
    u.handle,
    u.display_name,
    (
      SELECT COALESCE(COUNT(*), 0)
      FROM posts p
      WHERE p.target_user_id = u.id AND p.status = 'active'
    ) + (
      SELECT COALESCE(SUM(p.comment_count), 0)
      FROM posts p
      WHERE p.target_user_id = u.id AND p.status = 'active'
    ) AS activity
  FROM users u
  WHERE u.university_id = current_user_university_id()
    AND u.status = 'active'
    AND (
      search_query = ''
      OR u.handle ILIKE '%' || search_query || '%'
      OR u.display_name ILIKE '%' || search_query || '%'
    )
  ORDER BY activity DESC, u.handle ASC
  LIMIT result_limit
  OFFSET result_offset;
$$;
