-- 구미 라면축제 V2 마이그레이션 스크립트 (AR 헌트 & 쿠폰 지갑 기능)

-- 1. 사용자 지갑(Wallet) 테이블 (AR 스티커 수집용)
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT UNIQUE, -- 비로그인 익명 유저 지원용
    sticker_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. 쿠폰(Coupons) 테이블
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE,
    coupon_type TEXT NOT NULL, -- ex: 'RAMEN_FREE_TICKET', 'MD_GOODS_TICKET'
    is_used BOOLEAN DEFAULT FALSE,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    used_at TIMESTAMP WITH TIME ZONE
);

-- RLS 정책 설정
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can check their own wallet by device_id"
    ON public.wallets FOR SELECT
    USING (true);

CREATE POLICY "Anyone can update their wallet"
    ON public.wallets FOR UPDATE
    USING (true);

CREATE POLICY "Anyone can insert a wallet"
    ON public.wallets FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can see their coupons"
    ON public.coupons FOR SELECT
    USING (true);

CREATE POLICY "System can issue coupons"
    ON public.coupons FOR INSERT
    WITH CHECK (true);

-- 3. 트리거: 스티커 5개 달성 시 자동 쿠폰 발행 (선택적 구현)
CREATE OR REPLACE FUNCTION issue_coupon_on_five_stickers()
RETURNS TRIGGER AS $$
BEGIN
    -- 스티커가 5의 배수가 될 때마다 랜덤 교환권 지급
    IF NEW.sticker_count > 0 AND NEW.sticker_count % 5 = 0 AND OLD.sticker_count < NEW.sticker_count THEN
        INSERT INTO public.coupons (wallet_id, coupon_type)
        VALUES (NEW.id, 'RANDOM_GOODS_TICKET');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_issue_coupon
    AFTER UPDATE OF sticker_count ON public.wallets
    FOR EACH ROW
    EXECUTE FUNCTION issue_coupon_on_five_stickers();
