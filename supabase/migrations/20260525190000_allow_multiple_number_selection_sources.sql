-- Allow one-off checkout sessions and subscription selections to coexist for a member.
-- Active number uniqueness is already enforced by trg_enforce_unique_active_number_selection,
-- so the old per-user uniqueness constraint blocks valid paid entry rows.

ALTER TABLE public.number_selections
  DROP CONSTRAINT IF EXISTS number_selections_club_id_profile_id_key;

CREATE INDEX IF NOT EXISTS idx_number_selections_club_status
  ON public.number_selections(club_id, status);

CREATE INDEX IF NOT EXISTS idx_number_selections_club_profile_status
  ON public.number_selections(club_id, profile_id, status);

CREATE INDEX IF NOT EXISTS idx_number_selections_stripe_subscription_id
  ON public.number_selections(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
