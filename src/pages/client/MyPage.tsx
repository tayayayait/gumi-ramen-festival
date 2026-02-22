import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, ChevronRight, ShoppingBag, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePickupOrders } from "@/hooks/usePickupOrders";

export default function MyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { orders } = usePickupOrders();
  const activeOrderCount = orders.filter(o => o.status === 'pending' || o.status === 'ready_for_pickup').length;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 space-y-6">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-2">
          <span className="text-3xl">🍜</span>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-fluid-3xl font-black tracking-tight text-foreground">축제를 200% 즐기시려면?</h2>
          <p className="text-fluid-sm text-muted-foreground">로그인하고 스마트픽업과 라면 톡을<br/>더욱 편하게 이용해 보세요!</p>
        </div>
        <Button 
          onClick={() => navigate("/login", { state: { from: { pathname: "/mypage" } } })}
          className="w-full max-w-sm h-14 min-h-[56px] text-fluid-base bg-accent-blue hover:bg-accent-neon text-white font-bold rounded-2xl shadow-sm"
        >
          3초 만에 로그인/가입하기
        </Button>
      </div>
    );
  }

  // 로그인 상태의 마이페이지
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* 1. 사용자 프로필 헤더 */}
      <div className="bg-white px-6 pt-10 pb-8 border-b border-border shadow-sm">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16 border-2 border-white shadow-sm">
            <AvatarImage src={user.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-accent-blue text-white font-bold text-xl">
              {user.user_metadata?.name?.[0] || 'G'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-xl font-black text-foreground">
              {user.user_metadata?.name || '구미탐험대'} 님
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              오늘도 맛있는 라면 투어 하세요! 🍜
            </p>
          </div>
        </div>
      </div>

      {/* 2. 내 활동 / 알림 메뉴 */}
      <div className="mt-4 px-4 space-y-3">
        {/* 추후 구현될 기능들의 더미 메뉴 플레이스홀더 */}
        <div className="bg-white rounded-2xl shadow-sm border border-border divide-y divide-border overflow-hidden">
          <button onClick={() => navigate("/mypage/orders")} className="w-full px-5 py-5 min-h-[56px] flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-accent-blue" />
              <span className="text-sm font-bold text-gray-800">스마트 픽업 주문 내역</span>
            </div>
            <div className="flex items-center gap-2">
              {orders.length > 0 && (
                <span className="text-xs text-muted-foreground">{orders.length}건</span>
              )}
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>
          <button onClick={() => navigate("/mypage/notifications")} className="w-full px-5 py-5 min-h-[56px] flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-accent-orange" />
              <span className="text-sm font-bold text-gray-800">새로운 알림</span>
            </div>
            <div className="flex items-center gap-2">
              {activeOrderCount > 0 && (
                <span className="min-w-[20px] h-5 flex items-center justify-center bg-red-500 text-white text-[11px] font-bold rounded-full px-1.5">{activeOrderCount}</span>
              )}
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>
        </div>

        {/* 3. 로그아웃 버튼 영역 */}
        <button 
          onClick={handleLogout}
          className="w-full mt-6 px-5 py-5 min-h-[56px] flex items-center justify-center gap-2 text-fluid-sm font-bold text-red-500 bg-white rounded-2xl shadow-sm border border-border hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          로그아웃
        </button>
      </div>
    </div>
  );
}
