-- Ardmore rule: an active draw number can only belong to one person/subscription.

CREATE OR REPLACE FUNCTION public.enforce_unique_active_number_selection()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_duplicate integer;
BEGIN
  IF NEW.club_id = '31846fb2-b120-4815-bd48-e1120342d52e'::uuid AND NEW.status = 'active' THEN
    SELECT n INTO v_duplicate
    FROM unnest(NEW.numbers) AS n
    GROUP BY n
    HAVING count(*) > 1
    LIMIT 1;

    IF v_duplicate IS NOT NULL THEN
      RAISE EXCEPTION 'Duplicate number % in selection', v_duplicate;
    END IF;

    SELECT n INTO v_duplicate
    FROM public.number_selections ns
    CROSS JOIN LATERAL unnest(ns.numbers) AS n
    WHERE ns.club_id = NEW.club_id
      AND ns.status = 'active'
      AND ns.id <> NEW.id
      AND ns.numbers && NEW.numbers
    LIMIT 1;

    IF v_duplicate IS NOT NULL THEN
      RAISE EXCEPTION 'Draw number % is already active', v_duplicate;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_unique_active_number_selection ON public.number_selections;
CREATE TRIGGER trg_enforce_unique_active_number_selection
BEFORE INSERT OR UPDATE OF club_id, status, numbers
ON public.number_selections
FOR EACH ROW
EXECUTE FUNCTION public.enforce_unique_active_number_selection();

CREATE OR REPLACE FUNCTION public.enforce_unique_active_draw_subscription_numbers()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_duplicate integer;
BEGIN
  IF NEW.club_id = '31846fb2-b120-4815-bd48-e1120342d52e'::uuid AND NEW.status IN ('active', 'past_due') THEN
    SELECT n INTO v_duplicate
    FROM unnest(NEW.numbers) AS n
    GROUP BY n
    HAVING count(*) > 1
    LIMIT 1;

    IF v_duplicate IS NOT NULL THEN
      RAISE EXCEPTION 'Duplicate number % in subscription', v_duplicate;
    END IF;

    SELECT n INTO v_duplicate
    FROM public.draw_subscriptions ds
    CROSS JOIN LATERAL unnest(ds.numbers) AS n
    WHERE ds.club_id = NEW.club_id
      AND ds.status IN ('active', 'past_due')
      AND ds.id <> NEW.id
      AND ds.numbers && NEW.numbers
    LIMIT 1;

    IF v_duplicate IS NOT NULL THEN
      RAISE EXCEPTION 'Draw number % is already reserved by another subscription', v_duplicate;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_unique_active_draw_subscription_numbers ON public.draw_subscriptions;
CREATE TRIGGER trg_enforce_unique_active_draw_subscription_numbers
BEFORE INSERT OR UPDATE OF club_id, status, numbers
ON public.draw_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_unique_active_draw_subscription_numbers();
