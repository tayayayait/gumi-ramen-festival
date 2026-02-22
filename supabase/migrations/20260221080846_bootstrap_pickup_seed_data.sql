DO $$
DECLARE
  v_shop_id uuid;
  v_now timestamptz := timezone('utc'::text, now());
  v_slot_start timestamptz;
  v_slot_end timestamptz;
  v_slot_index integer;
BEGIN
  IF to_regclass('public.shops') IS NULL
     OR to_regclass('public.menus') IS NULL
     OR to_regclass('public.time_slots') IS NULL THEN
    RAISE NOTICE 'bootstrap_pickup_seed_data skipped: required tables are missing.';
    RETURN;
  END IF;

  SELECT id
  INTO v_shop_id
  FROM public.shops
  ORDER BY created_at NULLS LAST, id
  LIMIT 1;

  IF v_shop_id IS NULL THEN
    INSERT INTO public.shops (
      name,
      description,
      address
    )
    VALUES (
      'Gumi Ramen Pickup',
      'Default shop for pickup ordering flow',
      'Gumi Festival'
    )
    RETURNING id INTO v_shop_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.menus
    WHERE shop_id = v_shop_id
  ) THEN
    INSERT INTO public.menus (
      shop_id,
      name,
      category,
      price,
      description,
      image_url,
      inventory_count,
      is_sold_out,
      spice_level,
      tags
    )
    VALUES
      (
        v_shop_id,
        'Shin Ramyeon Original',
        'ramyeon',
        4500,
        'Classic spicy ramen',
        '/ramen-placeholder.png',
        120,
        false,
        3,
        ARRAY['classic', 'spicy']
      ),
      (
        v_shop_id,
        'Jjapaghetti Classic',
        'ramyeon',
        4500,
        'Rich black bean flavor',
        '/ramen-placeholder.png',
        120,
        false,
        0,
        ARRAY['classic']
      ),
      (
        v_shop_id,
        'Ansungtangmyun',
        'ramyeon',
        4000,
        'Savory mild broth',
        '/ramen-placeholder.png',
        120,
        false,
        1,
        ARRAY['mild']
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.time_slots
    WHERE shop_id = v_shop_id
      AND end_time > v_now
  ) THEN
    v_slot_start := date_trunc('hour', v_now + interval '1 hour');

    FOR v_slot_index IN 0..7 LOOP
      v_slot_end := v_slot_start + interval '15 minutes';

      INSERT INTO public.time_slots (
        shop_id,
        start_time,
        end_time,
        capacity,
        current_orders
      )
      VALUES (
        v_shop_id,
        v_slot_start,
        v_slot_end,
        30,
        0
      );

      v_slot_start := v_slot_end;
    END LOOP;
  END IF;
END;
$$;
