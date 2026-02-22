import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOrderNotifications } from "@/hooks/useOrderNotifications";
import type { OrderStatus } from "@/hooks/usePickupOrders";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  QrCode,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bgColor: string; icon: typeof Clock }
> = {
  pending: {
    label: "주문 접수",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 border-yellow-200",
    icon: Clock,
  },
  ready_for_pickup: {
    label: "픽업 가능",
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
    icon: Package,
  },
  completed: {
    label: "수령 완료",
    color: "text-green-600",
    bgColor: "bg-green-50 border-green-200",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "취소됨",
    color: "text-red-500",
    bgColor: "bg-red-50 border-red-200",
    icon: XCircle,
  },
};

export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const { orders } = useOrderNotifications();
  const [expandedQrOrderId, setExpandedQrOrderId] = useState<string | null>(null);

  const toggleQr = (orderId: string) => {
    setExpandedQrOrderId((prev) => (prev === orderId ? null : orderId));
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="bg-white px-4 py-4 border-b border-border shadow-sm flex items-center gap-3 sticky top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/mypage")}
          className="rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground w-10 h-10 min-w-[40px] min-h-[40px]"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-black text-foreground tracking-tight">스마트 픽업 주문 내역</h1>
      </div>

      <div className="px-4 py-4 space-y-3">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <Package className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">아직 주문 내역이 없습니다</p>
            <Button
              onClick={() => navigate("/pickup")}
              className="bg-accent-blue hover:bg-accent-blue/90 text-white font-bold rounded-xl px-6 min-h-[44px]"
            >
              스마트 픽업 주문하기
            </Button>
          </div>
        ) : (
          orders.map((order) => {
            const config = STATUS_CONFIG[order.status];
            const StatusIcon = config.icon;
            const date = new Date(order.createdAt);
            const timeStr = `${date.getMonth() + 1}/${date.getDate()} ${date
              .getHours()
              .toString()
              .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
            const canShowQr =
              order.status === "pending" || order.status === "ready_for_pickup";
            const isQrExpanded = expandedQrOrderId === order.id;

            return (
              <div
                key={order.id}
                className="w-full bg-white rounded-2xl border border-border shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => navigate(`/pickup/order/${order.id}`)}
                  className="w-full p-4 text-left hover:shadow-md transition-shadow active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-muted-foreground">{order.orderNumber}</span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${config.bgColor} ${config.color}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {config.label}
                    </span>
                  </div>

                  <div className="space-y-1 mb-3">
                    {order.items.slice(0, 3).map((item) => (
                      <div key={item.menuId} className="flex justify-between text-sm text-gray-700">
                        <span>
                          {item.name} <span className="text-muted-foreground">x {item.quantity}</span>
                        </span>
                        <span className="font-semibold">{(item.price * item.quantity).toLocaleString()}원</span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-xs text-muted-foreground">+ {order.items.length - 3}개 메뉴</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-xs text-muted-foreground">{timeStr}</span>
                    <span className="text-sm font-black text-accent-blue">{order.totalAmount.toLocaleString()}원</span>
                  </div>
                </button>

                <div className="px-4 pb-4">
                  {canShowQr ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => toggleQr(order.id)}
                        aria-label={isQrExpanded ? "Hide QR" : "Show QR"}
                        data-testid={`order-qr-toggle-${order.id}`}
                        className="w-full border-accent-blue/30 text-accent-blue hover:bg-accent-blue/5 rounded-xl min-h-[40px]"
                      >
                        <QrCode className="w-4 h-4 mr-1" />
                        {isQrExpanded ? "QR 닫기" : "QR 보기"}
                        {isQrExpanded ? (
                          <ChevronUp className="w-4 h-4 ml-1" />
                        ) : (
                          <ChevronDown className="w-4 h-4 ml-1" />
                        )}
                      </Button>

                      {isQrExpanded && (
                        <div
                          data-testid={`order-qr-panel-${order.id}`}
                          className="mt-3 bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2"
                        >
                          <QRCodeSVG
                            value={order.barcodeToken}
                            size={112}
                            bgColor="#ffffff"
                            fgColor="#000000"
                            level="H"
                            includeMargin={false}
                          />
                          <span className="text-[11px] font-mono font-bold text-gray-700 tracking-wide">
                            {order.orderNumber}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div
                      data-testid={`order-qr-expired-${order.id}`}
                      className="text-xs text-muted-foreground bg-gray-50 border border-gray-200 rounded-xl p-3 text-center font-medium"
                    >
                      QR 만료: 완료/취소된 주문은 스캔할 수 없습니다.
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
