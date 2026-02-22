-- supabase_schema_v3_pickup.sql
-- 픽업 시간 슬롯 및 주문 트랜잭션 RPC

-- 기존 V1에 있는 orders 및 time_slots 테이블을 기반으로,
-- 새로운 주문 생성 시 재고 차감 및 주문 항목 생성을 한 트랜잭션으로 처리하는 RPC입니다.

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
BEGIN
  -- 1. 주문 생성
  -- 이때 V1 스키마에 정의된 trigger (reserve_time_slot)가 실행되어
  -- capacity 검사 및 time_slots.current_orders 가 증가합니다.
  -- 만일 초과시 예외가 발생하여 전체 트랜잭션이 롤백됩니다.
  INSERT INTO public.orders (
    order_number,
    shop_id,
    time_slot_id,
    customer_name,
    total_amount,
    status
  ) VALUES (
    p_order_number,
    p_shop_id,
    p_time_slot_id,
    p_customer_name,
    p_total_amount,
    'pending'
  ) RETURNING id INTO v_order_id;

  -- 2. 주문 항목 추가 및 재고 차감
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_menu_id := (item->>'menu_id')::UUID;
    v_qty := (item->>'quantity')::INTEGER;
    v_price := (item->>'price')::INTEGER;

    -- 재고 차감 (0 이하로 떨어지지 않도록 보장하거나, 부족하면 에러)
    UPDATE public.menus
    SET inventory_count = inventory_count - v_qty,
        is_sold_out = CASE WHEN inventory_count - v_qty <= 0 THEN true ELSE false END
    WHERE id = v_menu_id AND inventory_count >= v_qty;

    IF NOT FOUND THEN
      RAISE EXCEPTION '재고가 부족합니다: menu_id %', v_menu_id;
    END IF;

    -- 주문 상세 추가
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

  RETURN jsonb_build_object('order_id', v_order_id);
EXCEPTION WHEN OTHERS THEN
  -- 시간 슬롯 마감 등의 V1 트리거 에러도 여기서 잡혀서 롤백됩니다.
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
