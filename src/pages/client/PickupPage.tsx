import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useCart } from "@/hooks/useCart";
import { usePickupOrders } from "@/hooks/usePickupOrders";
import { mockMenuItems, menuCategories } from "@/data/mock-data";
import { CartDrawer } from "@/components/pickup/CartDrawer";
import { PickupBarcodeView } from "@/components/pickup/PickupBarcodeView";
import { ShoppingCart, Plus, Minus, Flame, Package } from "lucide-react";
import type { PickupOrder } from "@/hooks/usePickupOrders";
import { useEffect } from "react";
import { useInventory } from "@/hooks/useInventory";
import { supabase } from "@/lib/supabase";

export default function PickupPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<PickupOrder | null>(null);
  const cart = useCart();
  const { createOrder } = usePickupOrders();
  const { toast } = useToast();

  const { items: inventoryItems } = useInventory();

  const filteredMenus =
    activeCategory === "all"
      ? inventoryItems
      : inventoryItems.filter((m) => m.category === activeCategory);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isSuccess = params.get("toss_success");
    const isFail = params.get("toss_fail");
    const paymentKey = params.get("paymentKey");
    const orderId = params.get("orderId");
    const amount = params.get("amount");
    
    if (isSuccess === "true" && paymentKey && orderId && amount) {
      if (cart.items.length === 0) {
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
      
      const slotData = sessionStorage.getItem("pendingPickupTimeSlot");
      let timeSlotId, timeSlotText;
      if (slotData) {
        const slot = JSON.parse(slotData);
        timeSlotId = slot.id;
        timeSlotText = slot.text;
      }
      const pendingNickname = sessionStorage.getItem("pendingPickupNickname") || "스마트픽업 고객";

      const confirmPayment = async () => {
        try {
          const { data: confirmData, error: confirmError } = await supabase.functions.invoke(
            "toss-confirm-payment",
            {
              body: {
                paymentKey,
                orderId,
                amount: Number(amount),
              },
            },
          );

          if (confirmError || !confirmData?.success) {
            throw new Error("결제 확인 실패");
          }

          try {
            const order = await createOrder(cart.items, cart.total, pendingNickname, timeSlotId, timeSlotText);
            
            cart.clearCart();
            sessionStorage.removeItem("pendingPickupTimeSlot");
            sessionStorage.removeItem("pendingPickupNickname");
            setDrawerOpen(false);
            setCompletedOrder(order);
            toast({
              title: "결제 완료",
              description: `주문번호: ${order.orderNumber} · 픽업시간: ${timeSlotText || "지정 없음"}`,
            });
          } catch (createError: any) {
            console.error("픽업 주문 생성 오류:", createError);
            const createErrorMessage =
              createError instanceof Error ? createError.message : "알 수 없는 주문 저장 오류";
            toast({
              variant: "destructive",
              title: "픽업 주문 생성 실패",
              description: `결제는 완료됐지만 주문 저장에 실패했습니다. 결제 주문번호(${orderId})를 운영자에게 전달해 주세요. (${createErrorMessage})`,
            });
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "결제 처리 중 문제가 발생했습니다. 네트워크 상태를 확인하고 다시 시도해 주세요.";
          console.error("결제 확인 오류:", error);
          toast({
            variant: "destructive",
            title: "결제 실패",
            description: errorMessage,
          });
        } finally {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };

      void confirmPayment();
      
    } else if (isFail === "true") {
      toast({
        variant: "destructive",
        title: "결제 실패",
        description: "결제가 취소되었거나 정보가 정확하지 않습니다. 다시 시도해 주세요.",
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [cart.items, cart.total, createOrder, toast]);

  // 결제 완료 주문은 바코드 화면으로 전환
  if (completedOrder) {
    return (
      <PickupBarcodeView
        order={completedOrder}
        onClose={() => setCompletedOrder(null)}
      />
    );
  }

  return (
    <div className="min-h-full px-4 py-6 flex flex-col gap-5 animate-fade-in-up pb-28">
      {/* 헤더 */}
      <div className="flex items-center justify-between safe-area-pt">
        <div>
          <h1 className="text-fluid-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-accent-neon tracking-tight">
            스마트 픽업
          </h1>
          <p className="text-fluid-sm text-muted-foreground mt-1">
            구미 라면을 미리 주문하고 현장에서 바로 픽업하세요.
          </p>
        </div>
        {/* 장바구니 버튼 */}
        <Button
          variant="outline"
          size="icon"
          className="relative h-14 w-14 rounded-2xl border-accent-blue/30 bg-accent-blue/10 hover:bg-accent-blue/20 shrink-0"
          onClick={() => setDrawerOpen(true)}
        >
          <ShoppingCart className="w-6 h-6 text-accent-blue" />
          {cart.itemCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-6 h-6 text-[11px] font-black bg-accent-orange text-white rounded-full shadow-lg animate-pulse">
              {cart.itemCount}
            </span>
          )}
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 pt-1 -mx-4 px-4 mask-edges">
        <button
          onClick={() => setActiveCategory("all")}
          className={`shrink-0 px-5 py-2.5 min-h-[44px] rounded-full text-fluid-sm font-bold transition-all border ${
            activeCategory === "all"
              ? "bg-accent-blue text-white border-accent-blue shadow-sm"
              : "bg-white text-muted-foreground border-border hover:bg-black/5"
          }`}
        >
          전체 메뉴
        </button>
        {menuCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all border ${
              activeCategory === cat.id
                ? "bg-accent-blue text-white border-accent-blue shadow-sm"
                : "bg-white text-muted-foreground border-border hover:bg-black/5"
            }`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* 硫붾돱 由ъ뒪??*/}
      <div className="flex flex-col gap-3">
        {filteredMenus.map((menu) => {
          const cartItem = cart.items.find((i) => i.menuId === menu.id);
          const inCart = cartItem ? cartItem.quantity : 0;
          const lowStock = menu.stock <= 10;

          return (
            <Card
              key={menu.id}
              className="overflow-hidden border-border bg-white shadow-sm hover:border-accent-blue/30 transition-all"
            >
              <div className="p-4 flex gap-4">
                {/* 메뉴 이름과 태그 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-foreground truncate">{menu.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                    {menu.description}
                  </p>

                  <div className="flex items-center gap-3">
                    <span className="text-base font-black text-foreground">
                      {menu.price.toLocaleString()}원
                    </span>

                    {/* 매운 정도 */}
                    {menu.spiceLevel > 0 && (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: menu.spiceLevel }).map((_, i) => (
                          <Flame key={i} className="w-3 h-3 text-red-500" />
                        ))}
                      </div>
                    )}

                    {/* ?ш퀬 */}
                    <div className="flex items-center gap-1 ml-auto">
                      <Package className={`w-3 h-3 ${lowStock ? "text-red-400" : "text-muted-foreground"}`} />
                      <span className={`text-[10px] font-bold ${lowStock ? "text-red-400" : "text-muted-foreground"}`}>
                        {menu.stock}개
                      </span>
                    </div>
                  </div>
                </div>

                {/* 수량 조절 */}
                <div className="flex flex-col items-center justify-center gap-1">
                  {inCart > 0 ? (
                    <div className="flex items-center gap-1 bg-accent-blue/5 rounded-2xl p-1 border border-accent-blue/20">
                      <button
                        onClick={() => cart.updateQuantity(menu.id, inCart - 1)}
                        className="w-10 h-10 min-w-[40px] flex items-center justify-center rounded-xl bg-white border border-border hover:bg-gray-50 transition-colors shadow-xs"
                      >
                        <Minus className="w-5 h-5 text-foreground" />
                      </button>
                      <span className="text-fluid-base font-black text-accent-blue w-6 text-center">
                        {inCart}
                      </span>
                      <button
                        onClick={() =>
                          cart.addItem({
                            menuId: menu.id,
                            name: menu.name,
                            price: menu.price,
                            category: menu.category,
                          })
                        }
                        className="w-10 h-10 min-w-[40px] flex items-center justify-center rounded-xl bg-accent-blue hover:bg-accent-neon transition-colors shadow-xs"
                      >
                        <Plus className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      disabled={menu.isSoldOut || menu.stock <= 0}
                      onClick={() =>
                        cart.addItem({
                          menuId: menu.id,
                          name: menu.name,
                          price: menu.price,
                          category: menu.category,
                        })
                      }
                      className="bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-blue border border-accent-blue/30 font-bold text-fluid-sm rounded-2xl h-11 px-5 min-h-[44px]"
                    >
                      <Plus className="w-4 h-4 mr-1" /> 담기
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 고정 결제 바 */}
      {cart.itemCount > 0 && (
        <div className="fixed bottom-[76px] left-0 right-0 z-40 max-w-md mx-auto px-4 pb-2">
          <Button
            onClick={() => setDrawerOpen(true)}
            className="w-full h-14 bg-accent-blue hover:bg-accent-neon text-white font-black text-base rounded-2xl shadow-sm transition-all"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            결제 진행 · {cart.itemCount}개 · {cart.total.toLocaleString()}원
          </Button>
        </div>
      )}

      {/* ?λ컮援щ땲 Drawer */}
      <CartDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        cart={cart}
      />
    </div>
  );
}
