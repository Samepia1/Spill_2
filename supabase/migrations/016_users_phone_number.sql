-- ============================================================
-- Users: Add phone number column
-- Used to match users to placeholder profiles when they sign up.
-- Unique per university (a phone number can only belong to one
-- user at each university).
-- ============================================================

ALTER TABLE users ADD COLUMN phone_number TEXT;

CREATE UNIQUE INDEX idx_users_phone_university
  ON users (phone_number, university_id)
  WHERE phone_number IS NOT NULL;
