import { useMemo, useState } from "react";
import {
  Camera,
  CheckCircle2,
  CheckSquare,
  Package,
  Search,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import { usePickupOrders, type OrderStatus, type PickupOrder } from "@/hooks/usePickupOrders";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { QRScanner } from "@/components/admin/QRScanner";

const STATUS_MAP: Record<OrderStatus, { label: string; color: string; badge: string }> = {
  pending: {
    label: "상품 준비중",
    color: "bg-orange-50/50 border-orange-200",
    badge: "bg-orange-100 text-orange-800",
  },
  ready_for_pickup: {
    label: "수령 대기",
    color: "bg-blue-50/50 border-blue-200",
    badge: "bg-blue-100 text-blue-800",
  },
  completed: {
    label: "수령 완료",
    color: "bg-green-50/50 border-green-200",
    badge: "bg-green-100 text-green-800",
  },
  cancelled: {
    label: "주문 취소",
    color: "bg-gray-50/50 border-gray-200",
    badge: "bg-gray-100 text-gray-800",
  },
};

export default function AdminOrdersPage() {
  const { orders: hookOrders, updateOrderStatus, getOrderByBarcode } = usePickupOrders({
    isAdmin: true,
  });
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"pending" | "ready_for_pickup" | "completed">(
    "pending"
  );
  const [searchQuery, setSearchQuery] = useState("");

  const allOrders = useMemo(() => {
    return [...hookOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [hookOrders]);

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) {
      return allOrders;
    }

    const query = searchQuery.toLowerCase();
    return allOrders.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
        order.items.some((item) => item.name.toLowerCase().includes(query))
    );
  }, [allOrders, searchQuery]);

  const displayedOrders = useMemo(() => {
    const target = filteredOrders.filter((o) => o.status === activeTab);
    return activeTab === "completed" ? target.slice(0, 50) : target;
  }, [activeTab, filteredOrders]);

  const counts = useMemo(
    () => ({
      pending: allOrders.filter((o) => o.status === "pending").length,
      ready_for_pickup: allOrders.filter((o) => o.status === "ready_for_pickup").length,
      completed: allOrders.filter((o) => o.status === "completed").length,
    }),
    [allOrders]
  );

  const processScan = async (scanValue: string) => {
    const normalized = scanValue.trim();
    if (!normalized) {
      return;
    }

    const order =
      getOrderByBarcode(normalized) ||
      allOrders.find((o) => o.orderNumber === normalized);

    if (!order) {
      toast({
        title: "주문 조회 실패",
        description: "유효하지 않은 QR/주문번호입니다.",
        variant: "destructive",
      });
      return;
    }

    if (order.status === "pending") {
      toast({
        title: "상품 준비중",
        description: `${order.orderNumber} 주문은 아직 준비중입니다.`,
        variant: "destructive",
      });
      return;
    }

    if (order.status !== "ready_for_pickup") {
      toast({
        title: "처리 불가",
        description: `${order.orderNumber} 주문은 이미 처리되었습니다.`,
      });
      return;
    }

    const result = await updateOrderStatus(order.id, "completed");
    if (!result.success) {
      toast({
        title: "주문 상태 변경 실패",
        description: result.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "수령 완료",
      description: `${order.orderNumber} (${order.customerName}) 주문을 완료 처리했습니다.`,
      className: "bg-green-50 border-green-200 text-green-900 border-2",
    });
  };

  const handleScannerSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const barcode = String(formData.get("barcode") ?? "");
    e.currentTarget.reset();
    void processScan(barcode);
  };

  const handleQRScanSuccess = (decodedText: string) => {
    void processScan(decodedText);
  };

  const advanceStatus = async (orderId: string, currentStatus: OrderStatus) => {
    const nextStatus =
      currentStatus === "pending"
        ? "ready_for_pickup"
        : currentStatus === "ready_for_pickup"
        ? "completed"
        : null;

    if (!nextStatus) {
      return;
    }

    const result = await updateOrderStatus(orderId, nextStatus);
    if (!result.success) {
      toast({
        title: "주문 상태 변경 실패",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  const cancelOrder = async (orderId: string) => {
    const result = await updateOrderStatus(orderId, "cancelled");
    if (!result.success) {
      toast({
        title: "주문 취소 실패",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  const OrderCard = ({ order }: { order: PickupOrder }) => {
    const statusConfig = STATUS_MAP[order.status];

    return (
      <Card
        className={cn(
          "border bg-white shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md",
          statusConfig.color
        )}
      >
        <div className="p-5 flex flex-col md:flex-row gap-5">
          <div className="flex-1 border-b md:border-b-0 md:border-r border-gray-200/50 pb-4 md:pb-0 md:pr-5">
            <div className="flex justify-between items-start mb-2 gap-2">
              <span className="font-bold text-gray-500 text-lg tracking-tight break-all">
                {order.orderNumber}
              </span>
              <Badge
                variant="secondary"
                data-testid={`admin-order-status-${order.id}`}
                className={cn("border-0 font-bold px-3 py-1 text-sm shrink-0", statusConfig.badge)}
              >
                {statusConfig.label}
              </Badge>
            </div>
            <div className="mt-1">
              <p className="text-sm text-gray-500 font-medium mb-1">픽업 닉네임</p>
              <h2 className="text-3xl md:text-4xl font-black text-accent-blue bg-accent-blue/5 inline-block px-3 py-1 rounded-lg break-all">
                {order.customerName || "이름없음"}
              </h2>
            </div>
            <p className="text-sm text-gray-400 font-medium mt-3">
              주문시각:{" "}
              {new Date(order.createdAt).toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="bg-white/80 rounded-xl p-4 border border-gray-100 flex flex-col gap-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">주문 상품</p>
              {order.items.map((item) => (
                <div key={`${order.id}-${item.menuId}`} className="flex justify-between text-base md:text-lg items-center py-1">
                  <span className="text-gray-900 font-bold truncate pr-3">{item.name}</span>
                  <span className="text-accent-blue font-black bg-white px-2.5 py-1 rounded-md shadow-sm border border-gray-100 flex-shrink-0">
                    {item.quantity}개
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 md:pt-0 flex flex-col gap-3 shrink-0 md:w-48 justify-center">
            {order.status === "pending" && (
              <Button
                data-testid={`admin-order-mark-ready-${order.id}`}
                onClick={() => void advanceStatus(order.id, order.status)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 md:h-16 text-lg shadow-sm"
              >
                <Package className="w-6 h-6 mr-2" /> 준비 완료
              </Button>
            )}
            {order.status === "ready_for_pickup" && (
              <Button
                data-testid={`admin-order-mark-complete-${order.id}`}
                onClick={() => void advanceStatus(order.id, order.status)}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold h-14 md:h-16 text-lg shadow-sm"
              >
                <CheckSquare className="w-6 h-6 mr-2" /> 수령 완료
              </Button>
            )}
            {order.status === "pending" && (
              <Button
                data-testid={`admin-order-cancel-${order.id}`}
                variant="ghost"
                onClick={() => void cancelOrder(order.id)}
                className="w-full text-red-500 hover:bg-red-50 hover:text-red-600 h-10 md:h-12 font-bold text-base mt-auto"
              >
                <XCircle className="w-5 h-5 mr-1.5" />
                주문 취소
              </Button>
            )}
            {order.status === "completed" && (
              <div className="flex flex-col items-center justify-center text-green-600 font-bold h-full bg-green-50/50 rounded-xl border border-green-100 p-4">
                <CheckCircle2 className="w-8 h-8 mb-2" />
                처리 완료
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-50/50 overflow-hidden relative">
      <div className="p-4 bg-white border-b border-gray-200 shrink-0 z-20 shadow-sm relative">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Package className="w-7 h-7 text-accent-blue" />
              현장 주문 관리
            </h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">
              모바일 QR 또는 주문번호로 상태를 변경하세요.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto">
            <form onSubmit={handleScannerSubmit} className="flex gap-2 w-full md:w-80">
              <div className="relative w-full">
                <Camera className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 cursor-pointer" />
                <Input
                  name="barcode"
                  placeholder="QR/바코드 또는 주문번호 입력"
                  className="pl-10 h-12 bg-gray-50 border-gray-300 focus-visible:ring-accent-blue rounded-xl shadow-inner text-base font-medium"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="h-12 px-6 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl shadow-sm whitespace-nowrap"
              >
                적용
              </Button>
            </form>

            <div className="relative w-full md:w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="주문번호, 닉네임, 상품명 검색"
                className="pl-10 h-12 bg-white border-gray-200 rounded-xl text-sm font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto md:hidden mt-3 rounded-xl overflow-hidden bg-gray-50 border border-gray-200 p-2">
          <QRScanner onScanSuccess={handleQRScanSuccess} />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 max-w-7xl mx-auto w-full p-4 lg:p-6">
        <Tabs
          value={activeTab}
          onValueChange={(v: string) => setActiveTab(v as "pending" | "ready_for_pickup" | "completed")}
          className="flex flex-col h-full"
        >
          <TabsList className="w-full bg-white p-2 rounded-2xl h-auto shadow-sm border border-gray-200 mb-6 shrink-0 grid grid-cols-3 gap-2">
            <TabsTrigger
              value="pending"
              className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-900 text-base sm:text-lg font-bold py-3 sm:py-4 rounded-xl"
            >
              <ShoppingBag className="w-5 h-5 mr-2 hidden sm:inline-block" />
              상품 준비중
              <Badge variant="secondary" className="ml-2 px-2.5 py-0.5 bg-orange-100/50 text-orange-700 text-xs rounded-full border border-orange-200/50">
                {counts.pending}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="ready_for_pickup"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-900 text-base sm:text-lg font-bold py-3 sm:py-4 rounded-xl"
            >
              <Package className="w-5 h-5 mr-2 hidden sm:inline-block" />
              수령 대기
              <Badge variant="secondary" className="ml-2 px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full shadow-sm">
                {counts.ready_for_pickup}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="data-[state=active]:bg-green-50 data-[state=active]:text-green-900 text-base sm:text-lg font-bold py-3 sm:py-4 rounded-xl"
            >
              <CheckCircle2 className="w-5 h-5 mr-2 hidden sm:inline-block" />
              최근 완료
              <Badge variant="secondary" className="ml-2 px-2.5 py-0.5 bg-green-100/50 text-green-700 text-xs rounded-full border border-green-200/50">
                {counts.completed}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 snap-y pb-20">
            {displayedOrders.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-300 rounded-2xl bg-white/50 shadow-sm mt-4">
                <Search className="w-12 h-12 mb-4 text-gray-300" />
                <p className="font-bold text-lg">해당 상태 주문이 없습니다.</p>
                <p className="text-sm mt-1 opacity-70">다음 주문을 기다리는 중입니다.</p>
              </div>
            ) : (
              displayedOrders.map((order) => (
                <div className="snap-start" key={order.id}>
                  <OrderCard order={order} />
                </div>
              ))
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
