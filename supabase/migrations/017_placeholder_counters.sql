-- ============================================================
-- Auto-update post_count and unique_poster_count on
-- placeholder_profiles when posts targeting them are inserted.
-- Matches the pattern from 005_counter_triggers.sql.
-- ============================================================

CREATE OR REPLACE FUNCTION update_placeholder_counters()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_has_previous BOOLEAN;
BEGIN
  IF NEW.target_placeholder_id IS NOT NULL THEN
    -- Check if this author has previously posted about this placeholder
    SELECT EXISTS (
      SELECT 1 FROM posts
      WHERE target_placeholder_id = NEW.target_placeholder_id
        AND author_user_id = NEW.author_user_id
        AND id != NEW.id
    ) INTO v_has_previous;

    -- Increment post_count always; increment unique_poster_count only for new authors
    IF v_has_previous THEN
      UPDATE placeholder_profiles
      SET post_count = post_count + 1,
          updated_at = now()
      WHERE id = NEW.target_placeholder_id;
    ELSE
      UPDATE placeholder_profiles
      SET post_count = post_count + 1,
          unique_poster_count = unique_poster_count + 1,
          updated_at = now()
      WHERE id = NEW.target_placeholder_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_placeholder_counters
AFTER INSERT ON posts
FOR EACH ROW EXECUTE FUNCTION update_placeholder_counters();
