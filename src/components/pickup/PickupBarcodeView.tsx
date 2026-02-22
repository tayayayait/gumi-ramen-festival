import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowLeft, Clock, Copy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { usePickupOrders, type PickupOrder } from "@/hooks/usePickupOrders";
import { useEffect, useState } from "react";

interface PickupBarcodeViewProps {
  order: PickupOrder;
  onClose: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "준비 중", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  ready_for_pickup: { label: "픽업 가능", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  completed: { label: "수령 완료", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  cancelled: { label: "취소됨", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export function PickupBarcodeView({ order: initialOrder, onClose }: PickupBarcodeViewProps) {
  const { toast } = useToast();
  const { getOrderById } = usePickupOrders();
  const [order, setOrder] = useState<PickupOrder>(initialOrder);
  const statusInfo = STATUS_LABELS[order.status] || STATUS_LABELS.pending;

  // order 상태 실시간 동기화 (Admin 등에서 변경 시)
  useEffect(() => {
    const interval = setInterval(() => {
      const updatedOrder = getOrderById(initialOrder.id);
      if (updatedOrder && updatedOrder.status !== order.status) {
        setOrder(updatedOrder);
        
        // 상태 변경 시 알림 (토스트)
        if (updatedOrder.status === "ready_for_pickup") {
          toast({
            title: "🔔 조리 완료!",
            description: "라면이 준비되었습니다. 픽업 데스크로 와주세요!",
            className: "bg-blue-50 border-blue-200 text-blue-800",
          });
        } else if (updatedOrder.status === "completed") {
          toast({
            title: "✅ 수령 완료",
            description: "맛있게 드세요! 축제를 계속 즐겨주세요.",
            className: "bg-green-50 border-green-200 text-green-800",
          });
          // 3초 뒤 메인으로 이동
          setTimeout(onClose, 3000);
        }
      }
    }, 1000); // MVP용 폴링 (Realtime 대체)

    return () => clearInterval(interval);
  }, [order.status, initialOrder.id, getOrderById, toast, onClose]);

  const handleCopyOrderNumber = () => {
    navigator.clipboard.writeText(order.orderNumber).then(() => {
      toast({ title: "복사 완료!", description: `주문번호 ${order.orderNumber}이 클립보드에 복사되었습니다.` });
    });
  };

  return (
    <div className="min-h-full px-4 py-6 flex flex-col gap-6 animate-fade-in-up pb-28">
      {/* 상단 */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="rounded-full text-muted-foreground hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-h2 font-bold text-white">주문 완료</h1>
      </div>

      {/* 성공 메시지 */}
      <div className="text-center space-y-3 py-4">
        <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-lg font-black text-white">결제가 완료되었습니다!</h2>
        <p className="text-sm text-muted-foreground">
          아래 바코드를 스캔 데스크에서 보여주세요.
        </p>
      </div>

      {/* 바코드 카드 */}
      <div className="bg-white rounded-3xl p-6 shadow-2xl mx-auto w-full max-w-sm">
        <div className="flex flex-col items-center gap-4">
          {/* QR 코드 */}
          <div className="w-full flex justify-center p-4 bg-white rounded-xl">
            <QRCode
              value={order.barcodeToken}
              size={180}
              level="H"
              fgColor="#000000"
              bgColor="#ffffff"
            />
          </div>

          {/* 주문 정보 */}
          <div className="w-full border-t border-gray-200 pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">주문번호</span>
              <button onClick={handleCopyOrderNumber} className="flex items-center gap-1 text-xs font-bold text-gray-800 hover:text-blue-600 transition-colors">
                {order.orderNumber}
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">상태</span>
              <Badge className={`${statusInfo.color} text-[10px]`}>{statusInfo.label}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">주문시간</span>
              <span className="text-xs text-gray-700 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(order.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            {order.timeSlotText && (
               <div className="flex items-center justify-between mt-1">
                 <span className="text-xs text-gray-500 font-bold">픽업 예약시간</span>
                 <span className="text-xs text-accent-blue font-black bg-blue-50 px-2 py-0.5 rounded">
                   {order.timeSlotText}
                 </span>
               </div>
            )}
          </div>

          {/* 주문 항목 */}
          <div className="w-full border-t border-gray-200 pt-3">
            <p className="text-[10px] font-bold text-gray-500 mb-2">주문 내역</p>
            {order.items.map((item) => (
              <div key={item.menuId} className="flex justify-between text-xs text-gray-700 py-0.5">
                <span>{item.name} × {item.quantity}</span>
                <span className="font-bold">{(item.price * item.quantity).toLocaleString()}원</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-black text-gray-900 border-t border-gray-200 mt-2 pt-2">
              <span>합계</span>
              <span>{order.totalAmount.toLocaleString()}원</span>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 안내 */}
      <div className="text-center space-y-2">
        <p className="text-xs text-muted-foreground">
          픽업 데스크에서 바코드를 스캔하면 주문이 확인됩니다.
        </p>
        <Button
          variant="outline"
          onClick={onClose}
          className="border-accent-blue/30 text-accent-blue hover:bg-accent-blue/10 font-bold rounded-xl"
        >
          다른 메뉴 더 주문하기
        </Button>
      </div>
    </div>
  );
}
