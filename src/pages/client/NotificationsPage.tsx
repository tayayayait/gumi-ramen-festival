import { useNavigate } from "react-router-dom";
import { useOrderNotifications } from "@/hooks/useOrderNotifications";
import type { OrderStatus } from "@/hooks/usePickupOrders";
import { ArrowLeft, Bell, Clock, CheckCircle2, XCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

const NOTIFICATION_CONFIG: Record<OrderStatus, { title: (num: string) => string; desc: string; icon: typeof Clock; color: string; bgColor: string }> = {
  pending: {
    title: (num) => `주문 #${num} 접수됨`,
    desc: "조리를 준비하고 있습니다. 잠시만 기다려주세요!",
    icon: Clock,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
  },
  ready_for_pickup: {
    title: (num) => `주문 #${num} 픽업 가능! 🎉`,
    desc: "수령 데스크에서 바코드를 보여주세요.",
    icon: Package,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  completed: {
    title: (num) => `주문 #${num} 수령 완료`,
    desc: "맛있게 드세요! 🍜",
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  cancelled: {
    title: (num) => `주문 #${num} 취소됨`,
    desc: "주문이 취소되었습니다.",
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-100",
  },
};

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { orders } = useOrderNotifications();

  // 최신 주문순 정렬 (이미 정렬되어 있지만 명시적으로)
  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* 헤더 */}
      <div className="bg-white px-4 py-4 border-b border-border shadow-sm flex items-center gap-3 sticky top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/mypage")}
          className="rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground w-10 h-10 min-w-[40px] min-h-[40px]"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-black text-foreground tracking-tight">새로운 알림</h1>
      </div>

      {/* 알림 리스트 */}
      <div className="px-4 py-4 space-y-2">
        {sortedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <Bell className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">아직 알림이 없습니다</p>
            <p className="text-xs text-muted-foreground text-center">라면을 주문하면 주문 상태 변경 알림이<br />여기에 표시됩니다!</p>
          </div>
        ) : (
          sortedOrders.map((order) => {
            const config = NOTIFICATION_CONFIG[order.status];
            const NotifIcon = config.icon;
            const isActive = order.status === "pending" || order.status === "ready_for_pickup";

            return (
              <button
                key={order.id}
                onClick={() => navigate(`/pickup/order/${order.id}`)}
                className={`w-full flex items-start gap-3 p-4 rounded-2xl text-left transition-all active:scale-[0.99] ${
                  isActive
                    ? "bg-white border-2 border-accent-blue/20 shadow-sm"
                    : "bg-white border border-border"
                }`}
              >
                {/* 아이콘 */}
                <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${config.bgColor}`}>
                  <NotifIcon className={`w-5 h-5 ${config.color}`} />
                </div>

                {/* 텍스트 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-bold ${isActive ? "text-foreground" : "text-gray-600"}`}>
                      {config.title(order.orderNumber)}
                    </p>
                    {isActive && (
                      <span className="w-2 h-2 shrink-0 mt-1.5 rounded-full bg-accent-blue" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{config.desc}</p>
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    {getRelativeTime(order.createdAt)} · {order.items.map(i => i.name).join(", ")}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
