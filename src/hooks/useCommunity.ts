import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  title: string;
  content: string;
  imageUrls: string[];
  tags: string[];
  likesCount: number;
  isLiked: boolean;
  comments: PostComment[];
  createdAt: string;
}

export interface PostComment {
  id: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

// Mock posts for fallback when Supabase is unavailable
const MOCK_POSTS: CommunityPost[] = [
  {
    id: "mock-1",
    authorId: "",
    authorName: "라면러버🍜",
    authorAvatar: "",
    title: "구미 불닭라면 부스 최고!",
    content: "매운맛 챌린지 성공했어요! 입이 아직도 얼얼하지만 너무 맛있었습니다 🌶️🔥",
    imageUrls: [],
    tags: ["매운맛", "도전"],
    likesCount: 24,
    isLiked: false,
    comments: [],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "mock-2",
    authorId: "",
    authorName: "축제탐험가",
    authorAvatar: "",
    title: "한우 라면은 꼭 드세요",
    content: "구미 한우로 육수를 낸 라면이 진짜 일품! 줄 서서 먹을 가치 있습니다 👍",
    imageUrls: [],
    tags: ["추천", "한우"],
    likesCount: 18,
    isLiked: false,
    comments: [],
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

/**
 * Supabase `community_posts` + `comments` + `post_likes` 기반 커뮤니티 훅.
 * DB 연결 실패 시 인메모리 fallback으로 동작합니다.
 */
export function useCommunity() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const loadedRef = useRef(false);

  // ── Supabase에서 게시글 로드 ──
  const fetchPosts = useCallback(async () => {
    try {
      const { data: postsData, error } = await supabase
        .from("community_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      if (!postsData || postsData.length === 0) {
        // DB에 데이터 없으면 mock fallback
        setPosts(MOCK_POSTS);
        setIsLoading(false);
        return;
      }

      const postIds = postsData.map((p: any) => p.id);

      // 댓글 가져오기
      const { data: allComments } = await supabase
        .from("comments")
        .select("*")
        .in("post_id", postIds)
        .order("created_at", { ascending: true });

      // 좋아요 수 가져오기
      const { data: allLikes } = await supabase
        .from("post_likes")
        .select("post_id, user_id")
        .in("post_id", postIds);

      const mapped: CommunityPost[] = postsData.map((p: any) => {
        const comments = (allComments || [])
          .filter((c: any) => c.post_id === p.id)
          .map((c: any) => ({
            id: c.id,
            authorName: c.author_name || "익명",
            authorAvatar: c.author_avatar || "",
            content: c.content,
            createdAt: c.created_at,
          }));

        const postLikes = (allLikes || []).filter((l: any) => l.post_id === p.id);

        return {
          id: p.id,
          authorId: p.author_id,
          authorName: p.author_name || "익명",
          authorAvatar: p.author_avatar || "",
          title: p.title || "",
          content: p.content,
          imageUrls: p.image_urls || [],
          tags: p.tags || [],
          likesCount: postLikes.length,
          isLiked: user ? postLikes.some((l: any) => l.user_id === user.id) : false,
          comments,
          createdAt: p.created_at,
        };
      });

      setPosts(mapped);
    } catch {
      console.warn("[useCommunity] Supabase 조회 실패, mock fallback");
      setPosts(MOCK_POSTS);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // ── 초기 로드 & Realtime 구독 ──
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    fetchPosts();

    const channel = supabase
      .channel("community_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_posts" }, () => fetchPosts())
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => fetchPosts())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, () => fetchPosts())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts]);

  // ── 게시글 작성 ──
  const createPost = useCallback(
    async (title: string, content: string, tags: string[] = [], imageUrls: string[] = []) => {
      if (!user) return;

      const authorName = user.user_metadata?.name || "익명";
      const authorAvatar = user.user_metadata?.avatar_url || "";

      // 낙관적 업데이트
      const optimisticPost: CommunityPost = {
        id: crypto.randomUUID(),
        authorId: user.id,
        authorName,
        authorAvatar,
        title,
        content,
        imageUrls,
        tags,
        likesCount: 0,
        isLiked: false,
        comments: [],
        createdAt: new Date().toISOString(),
      };
      setPosts((prev) => [optimisticPost, ...prev]);

      try {
        await supabase.from("community_posts").insert({
          author_id: user.id,
          author_name: authorName,
          author_avatar: authorAvatar,
          title,
          content,
          image_urls: imageUrls,
          tags,
        });
      } catch (err) {
        console.warn("[createPost] Supabase 실패:", err);
      }
    },
    [user]
  );

  // ── 좋아요 토글 ──
  const toggleLike = useCallback(
    async (postId: string) => {
      if (!user) return;

      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      // 낙관적 업데이트
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                isLiked: !p.isLiked,
                likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1,
              }
            : p
        )
      );

      try {
        if (post.isLiked) {
          // 좋아요 취소
          await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
        } else {
          // 좋아요 추가
          await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
        }
        // likes_count 동기화
        const { count } = await supabase
          .from("post_likes")
          .select("*", { count: "exact", head: true })
          .eq("post_id", postId);
        await supabase.from("community_posts").update({ likes_count: count || 0 }).eq("id", postId);
      } catch (err) {
        console.warn("[toggleLike] Supabase 실패:", err);
      }
    },
    [user, posts]
  );

  // ── 댓글 작성 ──
  const addComment = useCallback(
    async (postId: string, content: string) => {
      if (!user) return;

      const authorName = user.user_metadata?.name || "익명";
      const authorAvatar = user.user_metadata?.avatar_url || "";

      // 낙관적 업데이트
      const newComment: PostComment = {
        id: crypto.randomUUID(),
        authorName,
        authorAvatar,
        content,
        createdAt: new Date().toISOString(),
      };

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p
        )
      );

      try {
        await supabase.from("comments").insert({
          post_id: postId,
          author_id: user.id,
          author_name: authorName,
          author_avatar: authorAvatar,
          content,
        });
      } catch (err) {
        console.warn("[addComment] Supabase 실패:", err);
      }
    },
    [user]
  );

  return {
    posts,
    isLoading,
    createPost,
    toggleLike,
    addComment,
    refetch: fetchPosts,
  };
}
