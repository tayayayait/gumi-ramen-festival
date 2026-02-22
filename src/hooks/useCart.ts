import { useState, useCallback, useMemo, useEffect } from "react";

const CART_STORAGE_KEY = "gumi_cart_items";

export interface CartItem {
  menuId: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

/** sessionStorage에서 장바구니 복원 */
function loadCartFromStorage(): CartItem[] {
  try {
    const saved = sessionStorage.getItem(CART_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* 파싱 실패 시 빈 배열 */ }
  return [];
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(loadCartFromStorage);

  // items 변경 시 sessionStorage에 자동 동기화
  useEffect(() => {
    if (items.length > 0) {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } else {
      sessionStorage.removeItem(CART_STORAGE_KEY);
    }
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.menuId === item.menuId);
      if (existing) {
        return prev.map((i) =>
          i.menuId === item.menuId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((menuId: string) => {
    setItems((prev) => prev.filter((i) => i.menuId !== menuId));
  }, []);

  const updateQuantity = useCallback((menuId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.menuId !== menuId));
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.menuId === menuId ? { ...i, quantity } : i
      )
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );

  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  return { items, addItem, removeItem, updateQuantity, clearCart, total, itemCount };
}
