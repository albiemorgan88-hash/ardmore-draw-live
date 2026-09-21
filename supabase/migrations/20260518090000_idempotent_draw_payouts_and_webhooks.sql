-- Hardening for Ardmore draw payouts + Stripe webhook idempotency.
-- Non-destructive: creates missing payout ledger tables, adds event ledger,
-- and adds retry-safe uniqueness where existing data allows it.

ALTER TYPE public.draw_status ADD VALUE IF NOT EXISTS 'pending_payout';
ALTER TYPE public.draw_status ADD VALUE IF NOT EXISTS 'paid';
ALTER TYPE public.entry_status ADD VALUE IF NOT EXISTS 'expired';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT DEFAULT 'none'
    CHECK (stripe_connect_status IN ('none', 'pending', 'active', 'restricted', 'disabled'));

ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT;

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
  manually_paid BOOLEAN DEFAULT false,
  manually_paid_at TIMESTAMPTZ,
  manually_paid_by TEXT,
  notes TEXT,
  recipient_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS manually_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS manually_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manually_paid_by TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS recipient_name TEXT;

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payouts'
      AND policyname = 'Service role manages payouts'
  ) THEN
    CREATE POLICY "Service role manages payouts" ON public.payouts
      FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payouts'
      AND policyname = 'Users can view own payouts'
  ) THEN
    CREATE POLICY "Users can view own payouts" ON public.payouts
      FOR SELECT USING (auth.uid() = recipient_profile_id);
  END IF;
END $$;

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'claim_tokens'
      AND policyname = 'Service role manages claim tokens'
  ) THEN
    CREATE POLICY "Service role manages claim tokens" ON public.claim_tokens
      FOR ALL USING (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'processed', 'failed')),
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'stripe_events'
      AND policyname = 'Service role manages stripe events'
  ) THEN
    CREATE POLICY "Service role manages stripe events" ON public.stripe_events
      FOR ALL USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payouts_draw_id ON public.payouts(draw_id);
CREATE INDEX IF NOT EXISTS idx_payouts_recipient ON public.payouts(recipient_profile_id);
CREATE INDEX IF NOT EXISTS idx_claim_tokens_token ON public.claim_tokens(token);
CREATE INDEX IF NOT EXISTS idx_profiles_connect ON public.profiles(stripe_connect_id) WHERE stripe_connect_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stripe_events_status_created ON public.stripe_events(status, created_at);

-- Keep payout retries deterministic. These are safe for fresh payout rows and skipped
-- automatically if historical duplicates already exist.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_payouts_unique_platform_per_draw')
     AND NOT EXISTS (
       SELECT draw_id FROM public.payouts
       WHERE recipient_type = 'platform'
       GROUP BY draw_id HAVING count(*) > 1
     ) THEN
    EXECUTE 'CREATE UNIQUE INDEX idx_payouts_unique_platform_per_draw ON public.payouts(draw_id) WHERE recipient_type = ''platform''';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_payouts_unique_club_per_draw')
     AND NOT EXISTS (
       SELECT draw_id FROM public.payouts
       WHERE recipient_type = 'club'
       GROUP BY draw_id HAVING count(*) > 1
     ) THEN
    EXECUTE 'CREATE UNIQUE INDEX idx_payouts_unique_club_per_draw ON public.payouts(draw_id) WHERE recipient_type = ''club''';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_payouts_unique_winner_per_draw')
     AND NOT EXISTS (
       SELECT draw_id, recipient_type, recipient_profile_id, winning_number
       FROM public.payouts
       WHERE recipient_type IN ('winner_1st', 'winner_2nd', 'winner_3rd')
         AND recipient_profile_id IS NOT NULL
       GROUP BY draw_id, recipient_type, recipient_profile_id, winning_number
       HAVING count(*) > 1
     ) THEN
    EXECUTE 'CREATE UNIQUE INDEX idx_payouts_unique_winner_per_draw ON public.payouts(draw_id, recipient_type, recipient_profile_id, winning_number) WHERE recipient_type IN (''winner_1st'', ''winner_2nd'', ''winner_3rd'') AND recipient_profile_id IS NOT NULL';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_payouts_unique_stripe_transfer')
     AND NOT EXISTS (
       SELECT stripe_transfer_id FROM public.payouts
       WHERE stripe_transfer_id IS NOT NULL
       GROUP BY stripe_transfer_id HAVING count(*) > 1
     ) THEN
    EXECUTE 'CREATE UNIQUE INDEX idx_payouts_unique_stripe_transfer ON public.payouts(stripe_transfer_id) WHERE stripe_transfer_id IS NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_claim_tokens_unique_winner')
     AND NOT EXISTS (
       SELECT draw_id, profile_id, winning_number
       FROM public.claim_tokens
       GROUP BY draw_id, profile_id, winning_number HAVING count(*) > 1
     ) THEN
    EXECUTE 'CREATE UNIQUE INDEX idx_claim_tokens_unique_winner ON public.claim_tokens(draw_id, profile_id, winning_number)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name = 'stripe_payment_intent_id'
  )
  AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_payments_unique_stripe_payment_intent')
  AND NOT EXISTS (
    SELECT stripe_payment_intent_id FROM public.payments
    WHERE stripe_payment_intent_id IS NOT NULL
    GROUP BY stripe_payment_intent_id HAVING count(*) > 1
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX idx_payments_unique_stripe_payment_intent ON public.payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL';
  END IF;
END $$;
