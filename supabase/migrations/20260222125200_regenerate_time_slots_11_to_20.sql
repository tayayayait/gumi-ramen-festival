-- RPC: ensure_today_time_slots
-- config 기반으로 오늘 시간 슬롯을 자동 생성하는 SECURITY DEFINER 함수
-- 프론트엔드에서 anon key로 호출 가능

CREATE OR REPLACE FUNCTION public.ensure_today_time_slots(
  p_operating_start text DEFAULT '11:00',
  p_operating_end text DEFAULT '20:00',
  p_slot_duration_minutes integer DEFAULT 15,
  p_slot_capacity integer DEFAULT 30
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_id uuid;
  v_today date := (timezone('Asia/Seoul', now()))::date;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
  v_count integer := 0;
  v_existing integer;
BEGIN
  -- 첫 번째 shop 가져오기
  SELECT id INTO v_shop_id
  FROM public.shops
  ORDER BY created_at NULLS LAST, id
  LIMIT 1;

  IF v_shop_id IS NULL THEN
    RETURN 0;
  END IF;

  -- KST -> UTC 변환
  v_day_start := (v_today || ' ' || p_operating_start || ':00')::timestamp
                  AT TIME ZONE 'Asia/Seoul';
  v_day_end := (v_today || ' ' || p_operating_end || ':00')::timestamp
                AT TIME ZONE 'Asia/Seoul';

  -- 이미 오늘 슬롯이 있는지 확인
  SELECT count(*) INTO v_existing
  FROM public.time_slots
  WHERE shop_id = v_shop_id
    AND start_time >= v_day_start
    AND start_time < v_day_end;

  IF v_existing > 0 THEN
    RETURN v_existing;
  END IF;

  -- 시간 슬롯 생성
  v_slot_start := v_day_start;
  WHILE v_slot_start < v_day_end LOOP
    v_slot_end := v_slot_start + (p_slot_duration_minutes || ' minutes')::interval;
    IF v_slot_end > v_day_end THEN
      EXIT;
    END IF;

    INSERT INTO public.time_slots (shop_id, start_time, end_time, capacity, current_orders)
    VALUES (v_shop_id, v_slot_start, v_slot_end, p_slot_capacity, 0)
    ON CONFLICT DO NOTHING;

    v_count := v_count + 1;
    v_slot_start := v_slot_end;
  END LOOP;

  RETURN v_count;
END;
$$;

-- anon, authenticated 모두 호출 가능
GRANT EXECUTE ON FUNCTION public.ensure_today_time_slots(text, text, integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.ensure_today_time_slots(text, text, integer, integer) TO authenticated;
