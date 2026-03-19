-- Add last_sms_prompted_at to placeholder_profiles for SMS rate limiting
ALTER TABLE placeholder_profiles
  ADD COLUMN last_sms_prompted_at TIMESTAMPTZ;

-- Create referrals table for invite tracking
CREATE TABLE referrals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id      UUID NOT NULL REFERENCES users ON DELETE CASCADE,
  invitee_id      UUID REFERENCES users ON DELETE SET NULL,
  placeholder_id  UUID REFERENCES placeholder_profiles ON DELETE SET NULL,
  university_id   UUID NOT NULL REFERENCES universities ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_referrals_inviter ON referrals (inviter_id);
CREATE INDEX idx_referrals_placeholder ON referrals (placeholder_id);
CREATE INDEX idx_referrals_invitee ON referrals (invitee_id) WHERE invitee_id IS NOT NULL;

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own referrals"
  ON referrals FOR INSERT TO authenticated
  WITH CHECK (inviter_id = auth.uid() AND university_id = public.current_user_university_id());

CREATE POLICY "Users can read own referrals"
  ON referrals FOR SELECT TO authenticated
  USING (inviter_id = auth.uid());
