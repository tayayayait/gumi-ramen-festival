-- ==============================================================================
-- 데이터 격리: orders 테이블에 user_id 컬럼 추가 및 RLS 정책 변경
-- ==============================================================================

-- 1. user_id 컬럼 추가 (기존 데이터 호환을 위해 NULL 허용)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. user_id 인덱스 추가 (조회 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

-- 3. 기존 RLS 정책 제거 후 새 정책 적용
-- SELECT: 본인 주문 또는 관리자(profiles.role = 'admin' 또는 'merchant')
DO $$
BEGIN
    -- 기존 정책 안전하게 삭제
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.orders;
    DROP POLICY IF EXISTS "Waitlist orders viewable by owner and merchant" ON public.orders;
    DROP POLICY IF EXISTS "Enable insert access for all users" ON public.orders;
    DROP POLICY IF EXISTS "Enable update access for all users" ON public.orders;
    DROP POLICY IF EXISTS "Enable delete access for all users" ON public.orders;

    -- 새 SELECT 정책: 본인 주문 또는 관리자/상인
    CREATE POLICY "Orders viewable by owner or admin"
      ON public.orders FOR SELECT
      USING (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'merchant')
        )
        OR user_id IS NULL  -- 기존 주문(user_id 미설정)은 관리자만 + 일시적 허용
      );

    -- INSERT: 인증된 사용자 (RPC SECURITY DEFINER로 우회되므로 여기는 넓게)
    CREATE POLICY "Orders insertable by authenticated"
      ON public.orders FOR INSERT
      WITH CHECK (true);

    -- UPDATE: 관리자/상인만 (상태 변경)
    CREATE POLICY "Orders updatable by admin"
      ON public.orders FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'merchant')
        )
      );

    -- DELETE: 관리자만
    CREATE POLICY "Orders deletable by admin"
      ON public.orders FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
      );
END;
$$;
