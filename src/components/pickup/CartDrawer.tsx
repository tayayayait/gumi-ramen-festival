import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import type { CartItem } from "@/hooks/useCart";
import { TossPaymentWidget } from "@/components/pickup/TossPaymentWidget";
import { generateOrderNumber } from "@/lib/barcode-utils";
import { TimeSlotPicker, type TimeSlot } from "./TimeSlotPicker";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value: string) => UUID_PATTERN.test(value);

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: {
    items: CartItem[];
    total: number;
    itemCount: number;
    updateQuantity: (menuId: string, quantity: number) => void;
    removeItem: (menuId: string) => void;
  };
}

export function CartDrawer({ open, onOpenChange, cart }: CartDrawerProps) {
  const [showPaymentWidget, setShowPaymentWidget] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [nickname, setNickname] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const orderId = useMemo(() => generateOrderNumber(), [open]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setShowPaymentWidget(false);
    }
    onOpenChange(isOpen);
  };

  const currentOrderName =
    cart.items.length > 0
      ? `${cart.items[0].name}${cart.items.length > 1 ? ` 외 ${cart.itemCount - 1}개` : ""}`
      : "장바구니 결제";

  const runPaymentPreflight = async (): Promise<{ ok: boolean; message?: string }> => {
    if (!selectedSlot) {
      return { ok: false, message: "픽업 시간을 선택해 주세요." };
    }

    if (!isUuid(selectedSlot.id)) {
      return {
        ok: false,
        message: "선택한 픽업 시간 슬롯 정보가 올바르지 않습니다. 다시 선택해 주세요.",
      };
    }

    const invalidMenuItem = cart.items.find((item) => !isUuid(item.menuId));
    if (invalidMenuItem) {
      return {
        ok: false,
        message: `장바구니의 메뉴 데이터가 유효하지 않습니다: ${invalidMenuItem.name}`,
      };
    }

    try {
      const [
        { count: menuCount, error: menuError },
        { count: slotCount, error: slotsError },
        { data: selectedSlotRow, error: selectedSlotError },
      ] = await Promise.all([
        supabase.from("menus").select("id", { count: "exact", head: true }),
        supabase.from("time_slots").select("id", { count: "exact", head: true }),
        supabase
          .from("time_slots")
          .select("id, shop_id")
          .eq("id", selectedSlot.id)
          .maybeSingle(),
      ]);

      if (menuError || slotsError || selectedSlotError) {
        return {
          ok: false,
          message: "결제 전 데이터 검증에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        };
      }

      if ((menuCount ?? 0) === 0 || (slotCount ?? 0) === 0) {
        return {
          ok: false,
          message: "주문 기본 데이터(메뉴/시간대)가 준비되지 않았습니다. 관리자에게 문의해 주세요.",
        };
      }

      if (!selectedSlotRow?.id) {
        return {
          ok: false,
          message: "선택한 픽업 시간대가 더 이상 유효하지 않습니다. 다시 선택해 주세요.",
        };
      }

      if (!selectedSlotRow.shop_id || !isUuid(selectedSlotRow.shop_id)) {
        return {
          ok: false,
          message: "선택한 시간대에 매장 정보가 없어 결제를 진행할 수 없습니다.",
        };
      }

      return { ok: true };
    } catch {
      return {
        ok: false,
        message: "결제 전 검증 요청에 실패했습니다. 네트워크 상태를 확인해 주세요.",
      };
    }
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="bg-background border-t border-border max-h-[85vh]">
        <DrawerHeader className="border-b border-border pb-4">
          <DrawerTitle className="flex items-center justify-between text-foreground">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-accent-blue" />
              {showPaymentWidget ? "결제 수단 선택" : "장바구니"}
            </div>
            {!showPaymentWidget && (
              <span className="text-xs text-muted-foreground ml-1">{cart.itemCount}개 품목</span>
            )}
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 max-h-[50vh]">
          {showPaymentWidget ? (
            <TossPaymentWidget
              price={cart.total}
              orderName={currentOrderName}
              orderId={orderId}
              onSuccess={() => {}}
              onFail={() => {}}
              onCancel={() => setShowPaymentWidget(false)}
            />
          ) : cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ShoppingCart className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">장바구니가 비어 있습니다</p>
            </div>
          ) : (
            cart.items.map((item) => (
              <div
                key={item.menuId}
                className="flex items-center gap-3 bg-white rounded-xl p-3 border border-border shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.price.toLocaleString()}원 x {item.quantity}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-black/5 rounded-lg px-2 py-1 border border-border">
                    <button
                      onClick={() => cart.updateQuantity(item.menuId, item.quantity - 1)}
                      className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-black/10 transition-colors"
                    >
                      <Minus className="w-3 h-3 text-foreground" />
                    </button>
                    <span className="text-sm font-bold text-foreground w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => cart.updateQuantity(item.menuId, item.quantity + 1)}
                      className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-black/10 transition-colors"
                    >
                      <Plus className="w-3 h-3 text-foreground" />
                    </button>
                  </div>

                  <span className="text-sm font-black text-accent-blue min-w-[60px] text-right">
                    {(item.price * item.quantity).toLocaleString()}원
                  </span>

                  <button
                    onClick={() => cart.removeItem(item.menuId)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            ))
          )}

          {cart.items.length > 0 && !showPaymentWidget && (
            <div className="pt-2 space-y-4">
              <div className="px-1">
                <h3 className="text-sm font-bold text-foreground mb-2">픽업 닉네임 (필수)</h3>
                <Input
                  placeholder="닉네임 또는 핸드폰 끝 4자리"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="bg-white border-border"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  현장에서 본인 확인 시 사용됩니다.
                </p>
              </div>
              <TimeSlotPicker selectedId={selectedSlot?.id} onSelect={setSelectedSlot} />
            </div>
          )}
        </div>

        {cart.items.length > 0 && !showPaymentWidget && (
          <DrawerFooter className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">총 결제 금액</span>
              <span className="text-xl font-black text-foreground">{cart.total.toLocaleString()}원</span>
            </div>
            <Button
              onClick={async () => {
                if (!user) {
                  toast({
                    title: "로그인이 필요해요",
                    description: "로그인 후 결제를 진행해 주세요.",
                    action: (
                      <Button variant="outline" size="sm" onClick={() => navigate("/login")}>
                        이동
                      </Button>
                    ),
                  });
                  return;
                }

                if (!nickname.trim()) {
                  toast({
                    title: "픽업 닉네임을 입력해 주세요.",
                    variant: "destructive",
                  });
                  return;
                }

                if (!selectedSlot) {
                  toast({
                    title: "픽업 시간을 선택해 주세요.",
                    variant: "destructive",
                  });
                  return;
                }

                const preflight = await runPaymentPreflight();
                if (!preflight.ok) {
                  toast({
                    title: "결제 준비 실패",
                    description: preflight.message,
                    variant: "destructive",
                  });
                  return;
                }

                sessionStorage.setItem("pendingPickupTimeSlot", JSON.stringify(selectedSlot));
                sessionStorage.setItem("pendingPickupNickname", nickname.trim());
                setShowPaymentWidget(true);
              }}
              className="w-full h-14 bg-gradient-to-r from-accent-orange to-orange-500 hover:from-orange-500 hover:to-accent-orange text-white font-black text-base rounded-2xl shadow-glow-orange"
            >
              결제 진행  {cart.total.toLocaleString()}원
            </Button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
