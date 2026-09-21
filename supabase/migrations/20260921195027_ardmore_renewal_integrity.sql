-- Preserve existing reservations on renewal, including the established shared 97.
-- No new conflicting reservation is permitted. Both tables use the same club
-- lock; reconciliation and allocation writes cannot interleave for the club.
CREATE TABLE public.ardmore_legacy_shared_numbers (
  selection_id uuid PRIMARY KEY REFERENCES public.number_selections(id),
  profile_id uuid NOT NULL,
  number smallint NOT NULL CHECK (number = 97)
);
ALTER TABLE public.ardmore_legacy_shared_numbers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ardmore_legacy_shared_numbers FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ardmore_legacy_shared_numbers TO service_role;
-- Capture the two established selection identities from the verified live
-- records; do not assign a shared number to any new member or selection.
INSERT INTO public.ardmore_legacy_shared_numbers(selection_id, profile_id, number)
  SELECT id, profile_id, 97 FROM public.number_selections
  WHERE club_id = '31846fb2-b120-4815-bd48-e1120342d52e'::uuid
    AND status = 'active' AND 97 = ANY(numbers);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.ardmore_legacy_shared_numbers) <> 2
     OR (SELECT count(DISTINCT profile_id) FROM public.ardmore_legacy_shared_numbers) <> 2 THEN
    RAISE EXCEPTION 'The existing shared 97 agreement must be reviewed before applying this migration';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_unique_active_number_selection()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE v_duplicate integer;
BEGIN
  IF NEW.club_id <> '31846fb2-b120-4815-bd48-e1120342d52e'::uuid THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('ardmore-reservations:' || NEW.club_id::text, 0));
  IF NEW.status <> 'active' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND OLD.club_id = NEW.club_id
     AND OLD.profile_id = NEW.profile_id AND OLD.numbers IS NOT DISTINCT FROM NEW.numbers THEN
    RETURN NEW;
  END IF;
  SELECT n INTO v_duplicate FROM unnest(NEW.numbers) n GROUP BY n HAVING count(*) > 1 LIMIT 1;
  IF v_duplicate IS NOT NULL THEN RAISE EXCEPTION 'Duplicate number % in selection', v_duplicate; END IF;
  SELECT n INTO v_duplicate FROM public.number_selections ns
  CROSS JOIN LATERAL unnest(ns.numbers) n
  WHERE ns.club_id = NEW.club_id AND ns.status = 'active' AND ns.id <> NEW.id
    AND n = ANY(NEW.numbers)
    AND NOT EXISTS (
      SELECT 1 FROM public.ardmore_legacy_shared_numbers own_entry
      JOIN public.ardmore_legacy_shared_numbers other_entry ON other_entry.number = own_entry.number
      WHERE own_entry.selection_id = NEW.id AND own_entry.profile_id = NEW.profile_id
        AND other_entry.selection_id = ns.id AND other_entry.profile_id = ns.profile_id AND own_entry.number = n
    )
    -- Keeping a number already owned by this active selection is not a new
    -- allocation. This allows cancellations/additions without invalidating 97.
    AND NOT (TG_OP = 'UPDATE' AND OLD.status = 'active' AND OLD.club_id = NEW.club_id
      AND OLD.profile_id = NEW.profile_id AND n = ANY(OLD.numbers))
  ORDER BY n LIMIT 1;
  IF v_duplicate IS NOT NULL THEN RAISE EXCEPTION 'Draw number % is already active', v_duplicate; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_unique_active_draw_subscription_numbers()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE v_duplicate integer;
BEGIN
  IF NEW.club_id <> '31846fb2-b120-4815-bd48-e1120342d52e'::uuid THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('ardmore-reservations:' || NEW.club_id::text, 0));
  IF NEW.status NOT IN ('active', 'past_due') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IN ('active', 'past_due') AND OLD.club_id = NEW.club_id
     AND OLD.user_id = NEW.user_id AND OLD.numbers IS NOT DISTINCT FROM NEW.numbers THEN
    RETURN NEW;
  END IF;
  SELECT n INTO v_duplicate FROM unnest(NEW.numbers) n GROUP BY n HAVING count(*) > 1 LIMIT 1;
  IF v_duplicate IS NOT NULL THEN RAISE EXCEPTION 'Duplicate number % in subscription', v_duplicate; END IF;
  SELECT n INTO v_duplicate FROM public.draw_subscriptions ds
  CROSS JOIN LATERAL unnest(ds.numbers) n
  WHERE ds.club_id = NEW.club_id AND ds.status IN ('active', 'past_due') AND ds.id <> NEW.id
    AND n = ANY(NEW.numbers)
    AND NOT (TG_OP = 'UPDATE' AND OLD.status IN ('active', 'past_due') AND OLD.club_id = NEW.club_id
      AND OLD.user_id = NEW.user_id AND n = ANY(OLD.numbers))
  ORDER BY n LIMIT 1;
  IF v_duplicate IS NOT NULL THEN RAISE EXCEPTION 'Draw number % is already reserved by another subscription', v_duplicate; END IF;
  RETURN NEW;
END;
$$;

-- Include identity changes in uniqueness checks as well as numbers/status.
DROP TRIGGER IF EXISTS trg_enforce_unique_active_number_selection ON public.number_selections;
CREATE TRIGGER trg_enforce_unique_active_number_selection
BEFORE INSERT OR UPDATE OF club_id, profile_id, status, numbers ON public.number_selections
FOR EACH ROW EXECUTE FUNCTION public.enforce_unique_active_number_selection();
DROP TRIGGER IF EXISTS trg_enforce_unique_active_draw_subscription_numbers ON public.draw_subscriptions;
CREATE TRIGGER trg_enforce_unique_active_draw_subscription_numbers
BEFORE INSERT OR UPDATE OF club_id, user_id, status, numbers ON public.draw_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.enforce_unique_active_draw_subscription_numbers();

CREATE OR REPLACE FUNCTION public.reconcile_ardmore_number_selections(p_club_id uuid, p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_primary public.number_selections%ROWTYPE;
  v_sub public.draw_subscriptions%ROWTYPE;
  v_numbers smallint[] := '{}'::smallint[];
  v_names jsonb := '{}'::jsonb;
  v_representative text;
  v_expired integer;
BEGIN
  IF p_club_id IS DISTINCT FROM '31846fb2-b120-4815-bd48-e1120342d52e'::uuid OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid Ardmore reconciliation scope';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('ardmore-reservations:' || p_club_id::text, 0));
  -- Keep the active selection ID stable: draw history and the existing shared
  -- number agreement refer to these IDs. One-off checkout entries are separate.
  SELECT * INTO v_primary FROM public.number_selections
    WHERE club_id = p_club_id AND profile_id = p_user_id
      AND coalesce(stripe_subscription_id, '') NOT LIKE 'cs\_%' ESCAPE '\'
    ORDER BY EXISTS (SELECT 1 FROM public.ardmore_legacy_shared_numbers legacy WHERE legacy.selection_id = number_selections.id) DESC,
      (status = 'active') DESC,
      EXISTS (SELECT 1 FROM public.draw_subscriptions ds WHERE ds.club_id = p_club_id AND ds.user_id = p_user_id
        AND ds.status = 'active' AND ds.stripe_subscription_id = number_selections.stripe_subscription_id) DESC,
      created_at, id LIMIT 1 FOR UPDATE;

  FOR v_sub IN SELECT * FROM public.draw_subscriptions
      WHERE club_id = p_club_id AND user_id = p_user_id AND status = 'active'
      ORDER BY created_at, id FOR UPDATE
  LOOP
    v_numbers := v_numbers || v_sub.numbers::smallint[];
    v_names := v_names || coalesce(v_sub.assigned_names, '{}'::jsonb);
    v_representative := coalesce(v_representative, v_sub.stripe_subscription_id);
    IF v_sub.stripe_subscription_id = v_primary.stripe_subscription_id THEN
      v_representative := v_primary.stripe_subscription_id;
    END IF;
  END LOOP;
  SELECT coalesce(array_agg(DISTINCT n ORDER BY n), '{}'::smallint[]) INTO v_numbers FROM unnest(v_numbers) n;
  IF v_representative IS NULL THEN
    UPDATE public.number_selections SET status = 'expired', updated_at = now()
      WHERE club_id = p_club_id AND profile_id = p_user_id AND status = 'active'
        AND coalesce(stripe_subscription_id, '') NOT LIKE 'cs\_%' ESCAPE '\';
    GET DIAGNOSTICS v_expired = ROW_COUNT;
    RETURN jsonb_build_object('numbers', v_numbers, 'action', CASE WHEN v_expired > 0 THEN 'expired' ELSE 'unchanged' END);
  END IF;
  UPDATE public.number_selections SET status = 'expired', updated_at = now()
    WHERE club_id = p_club_id AND profile_id = p_user_id AND id <> v_primary.id AND status = 'active'
      AND coalesce(stripe_subscription_id, '') NOT LIKE 'cs\_%' ESCAPE '\';
  IF v_primary.id IS NOT NULL THEN
    UPDATE public.number_selections SET numbers = v_numbers, assigned_names = v_names,
      status = 'active', stripe_subscription_id = v_representative, updated_at = now()
      WHERE id = v_primary.id;
    RETURN jsonb_build_object('numbers', v_numbers, 'action', 'updated');
  END IF;
  INSERT INTO public.number_selections(club_id, profile_id, numbers, assigned_names, status, stripe_subscription_id)
    VALUES (p_club_id, p_user_id, v_numbers, v_names, 'active', v_representative);
  RETURN jsonb_build_object('numbers', v_numbers, 'action', 'inserted');
END;
$$;
REVOKE ALL ON FUNCTION public.reconcile_ardmore_number_selections(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_ardmore_number_selections(uuid, uuid) TO service_role;
