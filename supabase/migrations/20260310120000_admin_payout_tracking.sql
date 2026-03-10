-- Add manual payment tracking for treasurer
ALTER TABLE public.payouts
ADD COLUMN IF NOT EXISTS manually_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS manually_paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS manually_paid_by TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add winner_name to payouts for easy display (denormalized from profiles)
ALTER TABLE public.payouts
ADD COLUMN IF NOT EXISTS recipient_name TEXT;
