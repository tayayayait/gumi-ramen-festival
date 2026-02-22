import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Share2, Plus, Camera, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useCommunity } from "@/hooks/useCommunity";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

export default function CommunityPage() {
  const { posts, isLoading, createPost, toggleLike, addComment } = useCommunity();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newReview, setNewReview] = useState({ title: "", content: "", tags: "", image: null as string | null });
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState("");
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const requireLoginModal = () => {
    toast({
      title: "로그인이 필요해요 🍜",
      description: "로그인 페이지로 이동하시겠습니까?",
      action: (
        <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
          이동
        </Button>
      ),
    });
  };

  const handleCreateBtnClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      requireLoginModal();
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setNewReview(prev => ({ ...prev, image: imageUrl }));
    }
  };

  const handleReviewSubmit = () => {
    if (!newReview.title.trim() || !user) return;
    
    const tags = newReview.tags.split(',').map(t => t.trim()).filter(Boolean);
    const imageUrls = newReview.image ? [newReview.image] : [];
    
    createPost(newReview.title, newReview.content, tags, imageUrls);
    setIsModalOpen(false);
    setNewReview({ title: "", content: "", tags: "", image: null });
  };

  const handleLike = (postId: string) => {
    if (!user) {
      requireLoginModal();
      return;
    }
    toggleLike(postId);
  };

  const toggleCommentSection = (postId: string) => {
    if (activeCommentPostId === postId) {
      setActiveCommentPostId(null);
    } else {
      setActiveCommentPostId(postId);
      setCommentInput("");
    }
  };

  const handleCommentSubmit = (postId: string) => {
    if (!user) {
      requireLoginModal();
      return;
    }
    if (!commentInput.trim()) return;
    addComment(postId, commentInput.trim());
    setCommentInput("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent-blue" />
      </div>
    );
  }

  return (
    <div className="pb-24 px-4 pt-4 space-y-4">
      <div className="flex items-center justify-between mb-2 safe-area-pt">
        <div>
           <h1 className="text-fluid-4xl font-black text-foreground tracking-tight py-1">라면 톡</h1>
           <p className="text-fluid-sm text-muted-foreground mt-1">현장의 생생한 현황을 확인하세요.</p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button 
                onClick={handleCreateBtnClick}
                size="sm" 
                className="rounded-full bg-accent-blue hover:bg-accent-neon text-white font-bold h-12 min-h-[48px] px-5 shadow-sm text-fluid-sm"
            >
                <Plus className="w-5 h-5 mr-1" /> 리뷰 작성
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white text-foreground border-border w-[95vw] md:max-w-[400px] rounded-2xl p-5 shadow-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-gray-800">생생한 현장 리뷰 남기기 🍜</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4 overflow-y-auto max-h-[70vh] px-1 pb-2 scrollbar-hide">
              <div className="flex flex-col items-center justify-center">
                <div 
                  className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-gray-50 text-gray-400 cursor-pointer overflow-hidden relative hover:bg-gray-100 transition-colors"
                  onClick={() => document.getElementById('review-image-upload')?.click()}
                >
                  {newReview.image ? (
                    <img src={newReview.image} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera className="w-8 h-8 mb-1 text-gray-400" />
                      <span className="text-[10px] font-bold">사진 추가</span>
                    </>
                  )}
                  <input 
                    id="review-image-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs font-bold">제목</Label>
                <Input 
                  value={newReview.title} 
                  onChange={(e) => setNewReview(prev => ({...prev, title: e.target.value}))} 
                  placeholder="리뷰 제목을 입력해주세요" 
                  className="bg-white border-border rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs font-bold">내용</Label>
                <Textarea 
                  value={newReview.content} 
                  onChange={(e) => setNewReview(prev => ({...prev, content: e.target.value}))} 
                  placeholder="무슨 일이 있었나요?" 
                  className="bg-white border-border resize-none h-24 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs font-bold">태그 (쉼표로 구분)</Label>
                <Input 
                  value={newReview.tags} 
                  onChange={(e) => setNewReview(prev => ({...prev, tags: e.target.value}))} 
                  placeholder="예: 존맛탱,대기없음" 
                  className="bg-white border-border rounded-xl"
                />
              </div>
              <Button 
                onClick={handleReviewSubmit}
                className="w-full bg-accent-blue hover:bg-accent-neon text-white font-bold h-12 rounded-xl shadow-sm mt-4 text-[15px]"
              >
                리뷰 등록하기
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6 animate-fade-in-up mt-6">
          {posts.map((post) => (
            <Card key={post.id} className="bg-white border-border overflow-hidden shadow-sm rounded-2xl">
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8 border border-border">
                    <AvatarImage src={post.authorAvatar} />
                    <AvatarFallback>{post.authorName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-bold text-foreground leading-none">{post.authorName}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(post.createdAt)}</p>
                  </div>
                </div>
              </div>
              
              {post.imageUrls.length > 0 && (
                <div className="aspect-[4/3] w-full bg-gray-100 relative">
                     <img src={post.imageUrls[0]} alt={post.title} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="p-4 space-y-3">
                  <h3 className="text-[15px] font-black text-foreground leading-tight tracking-tight">{post.title}</h3>
                  {post.content && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{post.content}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                      {post.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[10px] h-6 bg-gray-50 text-gray-600 hover:bg-gray-100 border border-border px-2">
                              #{tag}
                          </Badge>
                      ))}
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-border mt-4">
                      <div className="flex items-center gap-4">
                          <button 
                            onClick={() => handleLike(post.id)}
                            className={`flex items-center gap-1.5 transition-colors p-2 -m-2 ${post.isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}
                          >
                              <span className="text-xs font-bold">Like</span>
                              <span className="text-xs font-bold">{post.likesCount}</span>
                          </button>
                          <button 
                            onClick={() => toggleCommentSection(post.id)}
                            className="flex items-center gap-1.5 text-muted-foreground hover:text-accent-blue transition-colors p-2 -m-2"
                          >
                              <MessageCircle className="w-5 h-5" />
                              <span className="text-xs font-bold">{post.comments.length}</span>
                          </button>
                      </div>
                        <button className="text-muted-foreground hover:text-foreground transition-colors p-2 -m-2">
                          <Share2 className="w-5 h-5" />
                      </button>
                  </div>
              </div>

              {/* Comments Section */}
              {activeCommentPostId === post.id && (
                <div className="bg-gray-50 border-t border-border p-4 space-y-4">
                  <div className="space-y-3 max-h-48 overflow-y-auto scrollbar-hide">
                    {post.comments.length === 0 ? (
                      <p className="text-xs text-center text-muted-foreground py-2">첫 번째 댓글을 남겨보세요!</p>
                    ) : (
                      post.comments.map(comment => (
                        <div key={comment.id} className="flex gap-2">
                          <Avatar className="w-6 h-6 border border-border">
                            <AvatarImage src={comment.authorAvatar} />
                          </Avatar>
                          <div className="flex-1 bg-white p-2.5 rounded-2xl rounded-tl-none shadow-sm border border-border">
                            <div className="flex items-baseline justify-between mb-1">
                              <span className="text-[11px] font-bold">{comment.authorName}</span>
                              <span className="text-[9px] text-muted-foreground">{timeAgo(comment.createdAt)}</span>
                            </div>
                            <p className="text-xs text-gray-700 leading-snug">{comment.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="flex items-end gap-2 pt-2">
                    <Textarea 
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder={user ? "댓글 달기..." : "로그인 후 댓글을 남길 수 있어요"}
                      className="min-h-[44px] h-[44px] resize-none rounded-2xl py-3 px-4 text-fluid-sm bg-white border-border shadow-sm flex-1"
                      onClick={() => !user && requireLoginModal()}
                      readOnly={!user}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleCommentSubmit(post.id);
                        }
                      }}
                    />
                    <Button 
                      size="icon" 
                      onClick={() => handleCommentSubmit(post.id)}
                      disabled={!commentInput.trim() || !user}
                      className="h-[44px] w-[44px] min-h-[44px] min-w-[44px] rounded-full bg-accent-blue hover:bg-accent-neon shrink-0 shadow-sm"
                    >
                      <Send className="w-5 h-5 text-white" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
      </div>
    </div>
  );
}
