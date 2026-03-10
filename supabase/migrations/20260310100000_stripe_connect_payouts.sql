-- Add Stripe Connect fields to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT DEFAULT 'none' 
    CHECK (stripe_connect_status IN ('none', 'pending', 'active', 'restricted', 'disabled'));

-- Add Stripe Connect field to clubs
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT;

-- Payouts table — tracks every payout per draw
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id UUID NOT NULL,
  club_id UUID REFERENCES public.clubs(id) NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('winner_1st', 'winner_2nd', 'winner_3rd', 'club', 'platform')),
  recipient_profile_id UUID REFERENCES auth.users(id),
  recipient_connect_id TEXT,
  amount_pence INTEGER NOT NULL,
  currency TEXT DEFAULT 'gbp',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'unclaimed', 'skipped')),
  stripe_transfer_id TEXT,
  transfer_group TEXT,
  winning_number INTEGER,
  error_message TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages payouts" ON public.payouts
  FOR ALL USING (true);

CREATE POLICY "Users can view own payouts" ON public.payouts
  FOR SELECT USING (auth.uid() = recipient_profile_id);

-- Claim tokens table — for winner onboarding
CREATE TABLE IF NOT EXISTS public.claim_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id UUID NOT NULL,
  profile_id UUID REFERENCES auth.users(id) NOT NULL,
  token TEXT UNIQUE NOT NULL,
  winning_number INTEGER NOT NULL,
  prize_place TEXT NOT NULL,
  amount_pence INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.claim_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages claim tokens" ON public.claim_tokens
  FOR ALL USING (true);

-- Update draws table to support new statuses
-- (drawn -> pending_payout -> paid)
-- We just need to ensure the status column allows these values
-- The existing check constraint may need updating
DO $$ 
BEGIN
  -- Drop existing constraint if it exists and re-create with new values
  ALTER TABLE public.draws DROP CONSTRAINT IF EXISTS draws_status_check;
  ALTER TABLE public.draws ADD CONSTRAINT draws_status_check 
    CHECK (status IN ('scheduled', 'drawn', 'pending_payout', 'paid', 'cancelled'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not update draws status constraint: %', SQLERRM;
END $$;

-- Index for faster payout lookups
CREATE INDEX IF NOT EXISTS idx_payouts_draw_id ON public.payouts(draw_id);
CREATE INDEX IF NOT EXISTS idx_payouts_recipient ON public.payouts(recipient_profile_id);
CREATE INDEX IF NOT EXISTS idx_claim_tokens_token ON public.claim_tokens(token);
CREATE INDEX IF NOT EXISTS idx_profiles_connect ON public.profiles(stripe_connect_id) WHERE stripe_connect_id IS NOT NULL;
