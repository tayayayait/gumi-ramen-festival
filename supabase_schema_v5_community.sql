-- ==============================================================================
-- 커뮤니티 기능 강화 마이그레이션 (V5) — 게시글 & 댓글 & 좋아요 테이블
-- ==============================================================================

-- 0. 게시글 (Community Posts) 테이블 — 기존에 없으면 생성
CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references auth.users(id) on delete cascade not null,
  shop_id uuid,
  content text not null,
  image_urls text[],
  likes_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_posts' AND policyname = 'Public community posts viewable') THEN
    CREATE POLICY "Public community posts viewable" ON public.community_posts FOR SELECT USING (true);
  END IF;
END $$;

-- 1. 댓글 (Comments) 테이블
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.community_posts(id) on delete cascade not null,
  author_id uuid references auth.users(id) on delete cascade not null,
  author_name text,
  author_avatar text,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. 좋아요 (Likes) 테이블 — 유저당 게시글 1회 제한
CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.community_posts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(post_id, user_id) -- 중복 좋아요 방지
);

-- community_posts 에 title, tags, author_name, author_avatar 컬럼 추가 (기존에 없을 경우)
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS tags text[];
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS author_name text;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS author_avatar text;

-- ==============================================================================
-- RLS 정책
-- ==============================================================================
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- 댓글: 누구나 읽기, 인증 유저만 쓰기
CREATE POLICY "Comments viewable by all" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON public.comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = author_id);

-- 좋아요: 누구나 읽기, 인증 유저만 토글
CREATE POLICY "Likes viewable by all" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

-- 게시글 삽입 정책 (인증 유저만)
CREATE POLICY "Authenticated users can post" ON public.community_posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Realtime 구독 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
