ALTER TABLE public.stripe_events ADD COLUMN IF NOT EXISTS lease_token uuid;
ALTER TABLE public.stripe_events ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz;

CREATE OR REPLACE FUNCTION public.claim_ardmore_stripe_event(p_id text, p_type text, p_token uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_id text; v_status text;
BEGIN
  IF p_id NOT LIKE 'evt\_%' ESCAPE '\' OR p_type IS NULL OR p_token IS NULL THEN
    RAISE EXCEPTION 'Invalid Stripe event claim';
  END IF;
  INSERT INTO public.stripe_events(id, type, status, lease_token, lease_expires_at, updated_at)
    VALUES (p_id, p_type, 'processing', p_token, now() + interval '5 minutes', now())
    ON CONFLICT (id) DO UPDATE SET status = 'processing', error_message = NULL,
      lease_token = EXCLUDED.lease_token, lease_expires_at = EXCLUDED.lease_expires_at, updated_at = now()
    WHERE stripe_events.type = p_type AND (stripe_events.status = 'failed'
      OR (stripe_events.status = 'processing'
        AND coalesce(stripe_events.lease_expires_at, stripe_events.updated_at + interval '5 minutes', stripe_events.created_at + interval '5 minutes') < now()))
    RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN RETURN jsonb_build_object('claimed', true, 'processed', false); END IF;
  SELECT status INTO v_status FROM public.stripe_events WHERE id = p_id AND type = p_type;
  RETURN jsonb_build_object('claimed', false, 'processed', v_status = 'processed');
END;
$$;
REVOKE ALL ON FUNCTION public.claim_ardmore_stripe_event(text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ardmore_stripe_event(text, text, uuid) TO service_role;
