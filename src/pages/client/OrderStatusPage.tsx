import { useParams, useNavigate } from "react-router-dom";
import { useOrderNotifications } from "@/hooks/useOrderNotifications";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, CheckCircle2, Loader2, XCircle } from "lucide-react";

const STATUS_STEPS = [
  {
    key: "pending",
    label: "상품 준비중",
    icon: Clock,
    description: "조리를 준비하고 있습니다",
  },
  {
    key: "ready_for_pickup",
    label: "수령 대기",
    icon: CheckCircle2,
    description: "수령 데스크에서 닉네임을 말해주세요",
  },
  {
    key: "completed",
    label: "최근 완료",
    icon: CheckCircle2,
    description: "맛있게 드세요",
  },
];

export default function OrderStatusPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { getOrderById, isLoadingOrders } = useOrderNotifications();

  const order = orderId ? getOrderById(orderId) : undefined;

  if (isLoadingOrders) {
    return (
      <div
        data-testid="order-status-loading"
        className="min-h-full px-4 py-6 flex flex-col gap-6 pb-28 safe-area-pt animate-pulse"
      >
        <p className="text-xs font-medium text-muted-foreground">
          주문 정보를 불러오는 중...
        </p>
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="h-56 rounded-2xl bg-gray-200" />
        <div className="h-64 rounded-2xl bg-gray-200" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center px-4 py-12 gap-4 safe-area-pt">
        <XCircle className="w-12 h-12 text-red-400" />
        <h2 className="text-fluid-2xl font-black text-foreground">주문을 찾을 수 없습니다</h2>
        <Button
          onClick={() => navigate("/pickup")}
          variant="outline"
          className="border-accent-blue/30 text-accent-blue rounded-xl min-h-[48px] px-6"
        >
          스마트 픽업으로 돌아가기
        </Button>
      </div>
    );
  }

  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === order.status);
  const canShowQr = order.status === "pending" || order.status === "ready_for_pickup";

  return (
    <div className="min-h-full px-4 py-6 flex flex-col gap-6 animate-fade-in-up pb-28 safe-area-pt">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/pickup")}
          className="rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground w-11 h-11 min-w-[44px] min-h-[44px]"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-fluid-3xl font-black text-foreground tracking-tight">주문 상태</h1>
        <Badge className="ml-auto bg-accent-blue/10 text-accent-blue border-accent-blue/20 text-xs">
          {order.orderNumber}
        </Badge>
      </div>

      <div className="space-y-1 px-2">
        {STATUS_STEPS.map((step, idx) => {
          const isActive = idx <= currentStepIdx;
          const isCurrent = idx === currentStepIdx;
          const StepIcon = step.icon;

          return (
            <div key={step.key} className="flex gap-4 items-start relative">
              {idx < STATUS_STEPS.length - 1 && (
                <div
                  className={`absolute left-[15px] top-8 w-0.5 h-8 ${
                    idx < currentStepIdx ? "bg-accent-blue" : "bg-gray-200"
                  }`}
                />
              )}
              <div
                className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center border-2 transition-all ${
                  isCurrent
                    ? "bg-accent-blue/10 border-accent-blue shadow-sm"
                    : isActive
                    ? "bg-accent-blue border-accent-blue"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                {isCurrent ? (
                  <Loader2 className="w-4 h-4 text-accent-blue animate-spin" />
                ) : (
                  <StepIcon className={`w-4 h-4 ${isActive ? "text-white" : "text-gray-400"}`} />
                )}
              </div>
              <div className="pb-8">
                <p className={`text-sm font-bold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                  {step.label}
                </p>
                {isCurrent && <p className="text-xs text-accent-blue mt-0.5">{step.description}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {canShowQr ? (
        <div
          data-testid="order-status-live-qr"
          className="bg-white rounded-2xl p-5 shadow-xl mx-auto w-[90vw] md:max-w-sm"
        >
          <div className="flex flex-col items-center justify-center gap-4">
            <p className="text-xs font-bold text-accent-orange animate-pulse text-center">
              빠른 스캔을 위해 화면 밝기를 높여주세요
            </p>
            <div className="p-3 bg-white rounded-xl border-4 border-accent-blue/20">
              <QRCodeSVG
                value={order.barcodeToken}
                size={180}
                bgColor="#ffffff"
                fgColor="#000000"
                level="H"
                includeMargin={false}
              />
            </div>
            <span className="font-mono text-sm font-bold text-gray-800 tracking-widest mt-1">{order.orderNumber}</span>
          </div>
        </div>
      ) : (
        <div
          data-testid="order-status-expired-qr"
          className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-center"
        >
          <p className="text-sm font-bold text-muted-foreground">QR 코드는 만료되었습니다</p>
          <p className="text-xs text-muted-foreground mt-1">완료되거나 취소된 주문은 다시 스캔할 수 없습니다.</p>
        </div>
      )}

      <div className="bg-white rounded-2xl p-5 border border-border shadow-sm space-y-2">
        <h3 className="text-xs font-bold text-muted-foreground mb-3">주문 내역</h3>
        {order.items.map((item) => (
          <div key={item.menuId} className="flex justify-between text-[15px] text-foreground font-medium">
            <span>
              {item.name} <span className="text-muted-foreground">x {item.quantity}</span>
            </span>
            <span className="font-bold">{(item.price * item.quantity).toLocaleString()}원</span>
          </div>
        ))}
        <div className="flex justify-between text-base font-black text-accent-blue border-t border-border mt-3 pt-3">
          <span>합계</span>
          <span>{order.totalAmount.toLocaleString()}원</span>
        </div>
      </div>
    </div>
  );
}
