-- ==============================================================================
-- 원평 누들-AI (K-Ramen Edition) 핵심 Supabase DB 스키마 설계 (PostgreSQL 확장)
-- 주요 역할: B2C 사용자(관광객), B2B 대상(상인용 상점 정보), AR 아이템 파밍, 축제 주문 및 재고/대기 관리
-- ==============================================================================

-- 1. PostGIS 확장 활성화 (공간 데이터 처리용 - 필수)
create extension if not exists postgis schema extensions;

-- ==============================================================================
-- 테이블 생성
-- ==============================================================================

-- 1. 사용자 정보 확장 테이블 (Supabase 내장 auth.users와 1:1 매칭)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  role text check (role in ('customer', 'merchant', 'admin')) default 'customer',
  g_coin_balance integer default 0, -- 획득한 G-코인 잔액
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. 상점 프로필 (B2B 상인 정보 및 위치)
create table public.shops (
  id uuid default gen_random_uuid() primary key,
  merchant_id uuid references public.profiles(id) on delete restrict,
  name text not null,
  description text,
  address text,
  location geometry(Point, 4326), -- 매장의 실제 GPS 좌표
  current_wait_count integer default 0, -- [신규] 실시간 대기 인원
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. 메뉴 정보 (상점별 제공 메뉴 및 실시간 재고 관리)
create table public.menus (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade not null,
  name text not null,
  category text,
  price integer not null,
  description text,
  image_url text,
  inventory_count integer default 100, -- [신규] 실시간 조회용 일일 재고 수량
  is_sold_out boolean default false, -- [신규] 품절 상태
  spice_level integer default 0,
  tags text[],
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3.5. 시간대별 픽업 슬롯 (신규: 트래픽 분산 및 capacity 제어)
create table public.time_slots (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade not null,
  start_time timestamp with time zone not null, -- 예: 12:00
  end_time timestamp with time zone not null,   -- 예: 12:15
  capacity integer not null default 50, -- 해당 슬롯에 받을 수 있는 최대 주문 수
  current_orders integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);


-- 4. 픽업 전용 주문 (배달 정보 제외)
create table public.orders (
  id uuid default gen_random_uuid() primary key,
  order_number text not null unique,
  shop_id uuid references public.shops(id) on delete cascade not null,
  customer_id uuid references public.profiles(id) on delete set null,
  time_slot_id uuid references public.time_slots(id) on delete restrict, -- [신규] 픽업 예약 시간대
  customer_name text,
  customer_phone text, -- 알림톡 및 픽업 호출용
  total_amount integer not null,
  status text check (status in ('pending', 'ready_for_pickup', 'completed', 'cancelled')) default 'pending', -- 요리중(cooking) 제거, 준비완료(ready_for_pickup) 상태로 단순화
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. 주문 상세 항목
create table public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  menu_id uuid references public.menus(id) on delete cascade not null,
  quantity integer not null,
  price_at_time integer not null
);

-- 6. AR 수집 아이템 (가상 라면 재료)
create table public.ar_items (
  id uuid default gen_random_uuid() primary key,
  item_type text check (item_type in ('egg', 'green_onion', 'cheese', 'gumi_beef', 'melon')) not null,
  location geometry(Point, 4326) not null, -- 아이템이 드랍되는 문화로 GPS 좌표
  spawned_at timestamp with time zone default timezone('utc'::text, now()),
  expires_at timestamp with time zone,
  is_collected boolean default false
);

-- 7. 유저 라이브 인벤토리 (재료 획득 기록)
create table public.user_inventory (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  item_id uuid references public.ar_items(id) on delete restrict not null,
  collected_at timestamp with time zone default timezone('utc'::text, now()),
  unique (user_id, item_id) -- 중복 획득 방지
);

-- 8. 리뷰 피드 (현장 커뮤니티용)
create table public.community_posts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references public.profiles(id) on delete cascade not null,
  shop_id uuid references public.shops(id) on delete set null,
  content text not null,
  image_urls text[], -- 리뷰 사진 및 AR 인증샷 이미지
  likes_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- ==============================================================================
-- Row Level Security (RLS) 정책 설정 (보안)
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.menus enable row level security;
alter table public.time_slots enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.ar_items enable row level security;
alter table public.user_inventory enable row level security;
alter table public.community_posts enable row level security;

-- 조회는 기본적으로 누구나(퍼블릭) 가능하도록 설정 (MVP 빠른 구현을 위해)
create policy "Public shops viewable" on public.shops for select using (true);
create policy "Public menus viewable" on public.menus for select using (true);
create policy "Public time_slots viewable" on public.time_slots for select using (true);
create policy "Public community posts viewable" on public.community_posts for select using (true);

-- 주문은 본인 것만 볼 수 있음 (혹은 휴대전화번호 필터링, 예시로는 단순화)
create policy "Waitlist orders viewable by owner and merchant" on public.orders for select using (true);

-- ==============================================================================
-- 자동 재고 차감 및 대기 인원 변동 함수 (Trigger)
-- ==============================================================================

-- 주문 생성 시 대기인원(current_wait_count) 1 증가 트리거
create or replace function increment_wait_count()
returns trigger as $$
begin
  update public.shops
  set current_wait_count = current_wait_count + 1
  where id = new.shop_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_order_created
  after insert on public.orders
  for each row
  execute function increment_wait_count();

-- 주문 수령(completed) 또는 취소 시 대기인원 1 감소 트리거
create or replace function decrement_wait_count()
returns trigger as $$
begin
  if (new.status = 'completed' or new.status = 'cancelled') and old.status not in ('completed', 'cancelled') then
    update public.shops
    set current_wait_count = greatest(0, current_wait_count - 1)
    where id = new.shop_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_order_completed_or_cancelled
  after update on public.orders
  for each row
  execute function decrement_wait_count();

-- [신규] 타임슬롯 예약 상태 확인 및 증가 트리거/함수
create or replace function reserve_time_slot()
returns trigger as $$
begin
  if new.time_slot_id is not null then
    -- capacity 초과 체크
    if exists (
      select 1 from public.time_slots 
      where id = new.time_slot_id and current_orders >= capacity
    ) then
      raise exception '해당 예약 시간은 이미 마감되었습니다.';
    end if;

    -- 선택한 time_slot의 current_orders 증가
    update public.time_slots
    set current_orders = current_orders + 1
    where id = new.time_slot_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_order_created_reserve_slot
  before insert on public.orders
  for each row
  execute function reserve_time_slot();

-- [신규] 주문 취소시 타임슬롯 카운트 감소
create or replace function release_time_slot()
returns trigger as $$
begin
  if new.status = 'cancelled' and old.status != 'cancelled' and new.time_slot_id is not null then
    update public.time_slots
    set current_orders = greatest(0, current_orders - 1)
    where id = new.time_slot_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_order_cancelled_release_slot
  after update on public.orders
  for each row
  execute function release_time_slot();

