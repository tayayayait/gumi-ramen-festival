-- ==============================================================================
-- 픽업 기능 구동을 위한 누락 테이블 및 RPC 통합 스크립트 (V4)
-- ==============================================================================

-- 1. 메뉴 (Menus) 테이블: 상점별 판매 라면, 판매가, 재고 관리
CREATE TABLE IF NOT EXISTS public.menus (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade not null,
  name text not null,
  category text,
  price integer not null,
  description text,
  image_url text,
  inventory_count integer default 100, -- 결제 시 자동 차감될 기본 재고 수량
  is_sold_out boolean default false,
  spice_level integer default 0,
  tags text[],
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. 타임 슬롯 (Time Slots) 테이블: 픽업 15분 단위 시간표 및 수용 인원
CREATE TABLE IF NOT EXISTS public.time_slots (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade not null,
  start_time timestamp with time zone not null, -- 예: 2026-02-21 12:00:00+09
  end_time timestamp with time zone not null,   -- 예: 2026-02-21 12:15:00+09
  capacity integer not null default 50, -- 해당 슬롯에 받을 수 있는 최대 주문 수
  current_orders integer not null default 0, -- 결제 시 자동 조회를 통해 1 증가
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. 주문 상세 (Order Items) 테이블: 주문건과 메뉴간 다대다(N:M) 연결 및 구매 이력
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  menu_id uuid references public.menus(id) on delete cascade not null,
  quantity integer not null,
  price_at_time integer not null -- 결제 당시의 가격 박제 (나중에 메뉴 가격이 올라도 영수증 유지)
);


-- ==============================================================================
-- RLS (Row Level Security) 설정
-- ==============================================================================
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 메뉴와 픽업 시간표는 고객이 앱에서 자유롭게(Public) 읽어야 하므로 SELECT 허용
CREATE POLICY "Public menus viewable" ON public.menus FOR SELECT USING (true);
CREATE POLICY "Public time_slots viewable" ON public.time_slots FOR SELECT USING (true);
CREATE POLICY "Order items viewable" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Order items insertable" ON public.order_items FOR INSERT WITH CHECK (true);

-- 앱 단에서 시간표의 current_orders와 inventory를 직접 변경하는 것은 제한(권장)하며,
-- 트랜잭션 함수(RPC) 내부에서 우회하여 SECURITY DEFINER 권한으로 업데이트할 예정입니다.
-- (실시간 알림을 위해 time_slots 구독 설정)
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_slots;


-- ==============================================================================
-- V1/V2를 기반으로 개량한 통합 트랜잭션 함수 (RPC)
-- ==============================================================================
CREATE OR REPLACE FUNCTION create_pickup_order(
  p_order_number TEXT,
  p_shop_id UUID,
  p_time_slot_id UUID,
  p_customer_name TEXT,
  p_total_amount INTEGER,
  p_items JSONB -- 배열 객체: [{ "menu_id": "해당_uuid", "quantity": 2, "price": 4500 }]
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
    FOR UPDATE; -- 동시 접근으로 인한 초과 예약을 막기 위한 Row Lock 잠금

    IF v_current_orders >= v_capacity THEN
      RAISE EXCEPTION '해당 예약 시간은 이미 마감되었습니다.';
    END IF;

    -- 자리 확보 (1 증가)
    UPDATE public.time_slots
    SET current_orders = current_orders + 1
    WHERE id = p_time_slot_id;
  END IF;

  -- 2. [주문 레코드 삽입]
  INSERT INTO public.orders (
    order_number,
    barcode_token, -- 2번 스키마 기준 Not Null
    customer_name,
    total_amount,
    status
  ) VALUES (
    p_order_number,
    'PU-' || p_order_number, -- 임시 바코드 토큰 생성 규칙
    p_customer_name,
    p_total_amount,
    'pending'
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


-- ==============================================================================
-- (테스트용) 더미/샘플 데이터 삽입
-- 복사해서 실행하시면 빈 화면에 픽업 시간이 보여지게 됩니다.
-- ==============================================================================
-- 아래의 'YOUR_SHOP_ID' 부분을 실제 상점 uuid로 교체하거나, 우선은 NULL 처리(또는 shop_id를 없애고)로 사용하세요.
-- 테스트 편의성을 위해 첫 번째 shop의 ID를 조회 후 삽입합니다.

DO $$
DECLARE
  v_first_shop_id UUID;
BEGIN
  SELECT id INTO v_first_shop_id FROM public.shops LIMIT 1;
  
  -- 상점이 있다면 시간대 삽입 (없으면 상점부터 만들어야 함)
  IF v_first_shop_id IS NOT NULL THEN
    INSERT INTO public.time_slots (shop_id, start_time, end_time, capacity, current_orders)
    VALUES
      (v_first_shop_id, now() + interval '1 hour', now() + interval '1 hour 15 minutes', 50, 0),
      (v_first_shop_id, now() + interval '1 hour 15 minutes', now() + interval '1 hour 30 minutes', 50, 0),
      (v_first_shop_id, now() + interval '1 hour 30 minutes', now() + interval '1 hour 45 minutes', 50, 0)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
