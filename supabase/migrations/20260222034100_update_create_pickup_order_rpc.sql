-- ==============================================================================
-- 데이터 격리: create_pickup_order RPC에 auth.uid() 자동 설정
-- ==============================================================================

CREATE OR REPLACE FUNCTION create_pickup_order(
  p_order_number TEXT,
  p_shop_id UUID,
  p_time_slot_id UUID,
  p_customer_name TEXT,
  p_total_amount INTEGER,
  p_items JSONB -- [{ "menu_id": "uuid", "quantity": int, "price": int }]
) RETURNS jsonb AS $$
DECLARE
  v_order_id UUID;
  item JSONB;
  v_menu_id UUID;
  v_qty INTEGER;
  v_price INTEGER;
  v_current_orders INTEGER;
  v_capacity INTEGER;
BEGIN
  -- 1. [Time Slot 검증] 선택한 시간대의 자리가 남아있는지 확인
  IF p_time_slot_id IS NOT NULL THEN
    SELECT current_orders, capacity
    INTO v_current_orders, v_capacity
    FROM public.time_slots
    WHERE id = p_time_slot_id
    FOR UPDATE; -- 동시 접근으로 인한 초과 예약을 막기 위한 Row Lock

    IF v_current_orders >= v_capacity THEN
      RAISE EXCEPTION '해당 예약 시간은 이미 마감되었습니다.';
    END IF;

    -- 자리 확보 (1 증가)
    UPDATE public.time_slots
    SET current_orders = current_orders + 1
    WHERE id = p_time_slot_id;
  END IF;

  -- 2. [주문 레코드 삽입] — user_id에 auth.uid() 자동 설정
  INSERT INTO public.orders (
    order_number,
    barcode_token,
    customer_name,
    total_amount,
    status,
    user_id
  ) VALUES (
    p_order_number,
    'PU-' || p_order_number,
    p_customer_name,
    p_total_amount,
    'pending',
    auth.uid()  -- 현재 인증된 사용자 ID 자동 설정
  ) RETURNING id INTO v_order_id;

  -- 3. [장바구니 순회 및 재고 차감]
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_menu_id := (item->>'menu_id')::UUID;
    v_qty := (item->>'quantity')::INTEGER;
    v_price := (item->>'price')::INTEGER;

    -- 재고 차감 시 부족하면 롤백 처리
    UPDATE public.menus
    SET inventory_count = inventory_count - v_qty,
        is_sold_out = CASE WHEN inventory_count - v_qty <= 0 THEN true ELSE false END
    WHERE id = v_menu_id AND inventory_count >= v_qty;

    IF NOT FOUND THEN
      RAISE EXCEPTION '재고가 부족합니다: menu_id %', v_menu_id;
    END IF;

    -- 주문 상세(영수증) 항목 추가
    INSERT INTO public.order_items (
      order_id,
      menu_id,
      quantity,
      price_at_time
    ) VALUES (
      v_order_id,
      v_menu_id,
      v_qty,
      v_price
    );
  END LOOP;

  -- 성공 시 최종 주문 ID 반환
  RETURN jsonb_build_object('order_id', v_order_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
