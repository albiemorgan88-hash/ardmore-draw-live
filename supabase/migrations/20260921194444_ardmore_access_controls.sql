-- Ardmore's browser only needs reserved numbers, club and status. Payment,
-- entry and draw mutations are performed by authenticated server routes.
ALTER POLICY "Service role manages subscriptions" ON public.draw_subscriptions TO service_role;
ALTER POLICY "Service role manages payouts" ON public.payouts TO service_role;
ALTER POLICY "Service role manages claim tokens" ON public.claim_tokens TO service_role;
ALTER POLICY "Service role manages stripe events" ON public.stripe_events TO service_role;
ALTER POLICY service_insert_draws ON public.draws TO service_role;

REVOKE ALL ON public.draw_subscriptions, public.number_selections FROM PUBLIC, anon, authenticated;
GRANT SELECT (numbers, club_id, status) ON public.draw_subscriptions, public.number_selections TO anon, authenticated;
GRANT ALL ON public.draw_subscriptions, public.number_selections TO service_role;

REVOKE ALL ON public.claim_tokens, public.stripe_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.claim_tokens, public.stripe_events TO service_role;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.payouts, public.payments, public.draws FROM PUBLIC, anon, authenticated;
REVOKE SELECT ON public.payouts FROM PUBLIC, anon;
-- The existing own-payout policy protects authenticated reads.
GRANT SELECT ON public.payouts TO authenticated;
GRANT ALL ON public.payouts, public.payments, public.draws TO service_role;

-- These legacy functions bypass RLS and have no internal caller check.
-- They are not used by the current application. Do not execute either here.
REVOKE ALL ON FUNCTION public.execute_draw(uuid), public.close_draw_and_snapshot(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_draw(uuid), public.close_draw_and_snapshot(uuid) TO service_role;
ALTER FUNCTION public.execute_draw(uuid) SET search_path = pg_catalog, public, extensions;
ALTER FUNCTION public.close_draw_and_snapshot(uuid) SET search_path = pg_catalog, public, extensions;
