CREATE TABLE IF NOT EXISTS public.draw_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  numbers INTEGER[] NOT NULL,
  assigned_names JSONB DEFAULT '{}',
  amount_pence INTEGER NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'unpaid')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.draw_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON public.draw_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role manages subscriptions" ON public.draw_subscriptions
  FOR ALL USING (true);
