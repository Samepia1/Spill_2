-- ============================================================
-- Update search RPC to include unclaimed placeholder profiles
-- Must DROP first because return type is changing (adding is_placeholder)
-- ============================================================

DROP FUNCTION IF EXISTS search_users_by_activity(text, integer, integer);

CREATE OR REPLACE FUNCTION search_users_by_activity(
  search_query TEXT DEFAULT '',
  result_limit INT DEFAULT 20,
  result_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  handle TEXT,
  display_name TEXT,
  avatar_url TEXT,
  activity BIGINT,
  is_placeholder BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  -- Combine real users and unclaimed placeholders, ranked by activity
  SELECT * FROM (
    -- Real users (existing query)
    SELECT
      u.id,
      u.handle,
      u.display_name,
      u.avatar_url,
      (
        SELECT COALESCE(COUNT(*), 0)
        FROM posts p
        WHERE p.target_user_id = u.id AND p.status = 'active'
      ) + (
        SELECT COALESCE(SUM(p.comment_count), 0)
        FROM posts p
        WHERE p.target_user_id = u.id AND p.status = 'active'
      ) AS activity,
      false AS is_placeholder
    FROM users u
    WHERE u.university_id = current_user_university_id()
      AND u.status = 'active'
      AND (
        search_query = ''
        OR u.handle ILIKE '%' || search_query || '%'
        OR u.display_name ILIKE '%' || search_query || '%'
      )

    UNION ALL

    -- Unclaimed placeholder profiles
    SELECT
      pp.id,
      pp.handle,
      NULL::TEXT AS display_name,
      NULL::TEXT AS avatar_url,
      pp.post_count::BIGINT AS activity,
      true AS is_placeholder
    FROM placeholder_profiles pp
    WHERE pp.university_id = current_user_university_id()
      AND pp.claimed_by IS NULL
      AND (
        search_query = ''
        OR pp.handle ILIKE '%' || search_query || '%'
      )
  ) combined
  ORDER BY activity DESC, handle ASC
  LIMIT result_limit
  OFFSET result_offset;
$$;
