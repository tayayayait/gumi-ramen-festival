import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { mockMenuItems, MenuItem } from "@/data/mock-data";

const INVENTORY_STORAGE_KEY = "gumi_inventory";
const INVENTORY_UPDATED_EVENT = "inventory-updated";
const INVENTORY_POLLING_INTERVAL_MS = 3000;

/**
 * Supabase `menus` table based inventory hook.
 * Falls back to localStorage when DB is unavailable.
 */
export function useInventory() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const loadedRef = useRef(false);

  const loadFromLocalStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(INVENTORY_STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
        return;
      }
    } catch {
      // Ignore parse errors and rebuild defaults below.
    }

    const initial = mockMenuItems.map((m) => ({
      ...m,
      stock: m.stock ?? 100,
      isSoldOut: m.isSoldOut ?? false,
    }));

    setItems(initial);
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(initial));
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("menus")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const mapped: MenuItem[] = data.map((m: any) => ({
          id: m.id,
          name: m.name,
          category: m.category || "ramyeon",
          price: m.price,
          description: m.description || "",
          image: m.image_url || "/ramen-placeholder.png",
          spiceLevel: m.spice_level || 0,
          tags: m.tags || [],
          stock: m.inventory_count ?? 100,
          isSoldOut: m.is_sold_out ?? false,
          isAvailable: !(m.is_sold_out ?? false),
        }));

        setItems(mapped);
        localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(mapped));
      } else {
        loadFromLocalStorage();
      }
    } catch {
      console.warn("[useInventory] Supabase fetch failed, using localStorage fallback");
      loadFromLocalStorage();
    } finally {
      setIsLoading(false);
    }
  }, [loadFromLocalStorage]);

  useEffect(() => {
    if (loadedRef.current) {
      return;
    }
    loadedRef.current = true;

    void fetchInventory();

    const channel = supabase
      .channel("menus_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menus" },
        () => {
          void fetchInventory();
        }
      )
      .subscribe();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === INVENTORY_STORAGE_KEY && e.newValue) {
        setItems(JSON.parse(e.newValue));
      }
    };
    window.addEventListener("storage", handleStorage);

    const handleInventoryUpdated = () => {
      const latest = localStorage.getItem(INVENTORY_STORAGE_KEY);
      if (latest) {
        setItems(JSON.parse(latest));
      }
    };
    window.addEventListener(INVENTORY_UPDATED_EVENT, handleInventoryUpdated as EventListener);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchInventory();
      }
    }, INVENTORY_POLLING_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchInventory();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(INVENTORY_UPDATED_EVENT, handleInventoryUpdated as EventListener);
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchInventory]);

  const updateItemsAndSync = useCallback((newItems: MenuItem[]) => {
    setItems(newItems);
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(newItems));
    window.dispatchEvent(new CustomEvent(INVENTORY_UPDATED_EVENT));
  }, []);

  const updateStock = useCallback(
    async (itemId: string, newStock: number) => {
      const target = items.find((i) => i.id === itemId);
      if (!target) {
        return { success: false, error: "상품을 찾을 수 없습니다." };
      }

      const safeStock = Math.max(0, newStock);
      const updated = items.map((item) =>
        item.id === itemId
          ? { ...item, stock: safeStock, isSoldOut: safeStock <= 0 }
          : item
      );
      updateItemsAndSync(updated);

      try {
        const { data, error } = await supabase
          .from("menus")
          .update({ inventory_count: safeStock, is_sold_out: safeStock <= 0 })
          .eq("id", itemId)
          .select();

        if (error) {
          throw error;
        }
        if (!data || data.length === 0) {
          throw new Error("업데이트 권한이 없거나 상품을 찾을 수 없습니다.");
        }
        return { success: true };
      } catch (err: any) {
        console.error("[updateStock] Supabase update failed:", err);
        updateItemsAndSync(items);
        return {
          success: false,
          error: err.message || "수량 수정(DB 반영)에 실패했습니다.",
        };
      }
    },
    [items, updateItemsAndSync]
  );

  const toggleSoldOut = useCallback(
    async (itemId: string, forcedSoldOut?: boolean) => {
      const target = items.find((i) => i.id === itemId);
      if (!target) {
        return { success: false, error: "상품을 찾을 수 없습니다." };
      }

      const newSoldOut =
        typeof forcedSoldOut === "boolean" ? forcedSoldOut : !target.isSoldOut;

      const updated = items.map((item) =>
        item.id === itemId ? { ...item, isSoldOut: newSoldOut } : item
      );
      updateItemsAndSync(updated);

      try {
        const { data, error } = await supabase
          .from("menus")
          .update({ is_sold_out: newSoldOut })
          .eq("id", itemId)
          .select();

        if (error) {
          throw error;
        }
        if (!data || data.length === 0) {
          throw new Error("업데이트 권한이 없거나 상품을 찾을 수 없습니다.");
        }
        return { success: true };
      } catch (err: any) {
        console.error("[toggleSoldOut] Supabase update failed:", err);
        updateItemsAndSync(items);
        return {
          success: false,
          error: err.message || "품절 상태 변경(DB 반영)에 실패했습니다.",
        };
      }
    },
    [items, updateItemsAndSync]
  );

  const addItem = useCallback(
    async (newItem: Omit<MenuItem, "id">) => {
      const id = crypto.randomUUID();
      const item: MenuItem = { ...newItem, id };
      const updated = [...items, item];
      updateItemsAndSync(updated);

      try {
        const shopIdResponse = await supabase.from("shops").select("id").limit(1);
        const shopId = shopIdResponse.data?.[0]?.id;

        const { data, error } = await supabase
          .from("menus")
          .insert({
            id,
            name: newItem.name,
            category: newItem.category,
            price: newItem.price,
            description: newItem.description,
            image_url: newItem.image,
            inventory_count: newItem.stock ?? 100,
            is_sold_out: newItem.isSoldOut ?? false,
            spice_level: newItem.spiceLevel ?? 0,
            tags: newItem.tags ?? [],
            shop_id: shopId,
          })
          .select();

        if (error) {
          throw error;
        }
        if (!data || data.length === 0) {
          throw new Error("상품 추가 권한이 없습니다.");
        }
        return { success: true };
      } catch (err: any) {
        console.error("[addItem] Supabase update failed:", err);
        updateItemsAndSync(items);
        return {
          success: false,
          error: err.message || "상품 추가(DB 반영)에 실패했습니다.",
        };
      }
    },
    [items, updateItemsAndSync]
  );

  const editItem = useCallback(
    async (itemId: string, updates: Partial<MenuItem>) => {
      const originalItem = items.find((i) => i.id === itemId);
      if (!originalItem) {
        return { success: false, error: "상품을 찾을 수 없습니다." };
      }

      const updated = items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      );
      updateItemsAndSync(updated);

      try {
        const dbUpdates: Record<string, unknown> = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.category !== undefined) dbUpdates.category = updates.category;
        if (updates.price !== undefined) dbUpdates.price = updates.price;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.image !== undefined) dbUpdates.image_url = updates.image;
        if (updates.stock !== undefined) dbUpdates.inventory_count = updates.stock;
        if (updates.isSoldOut !== undefined) dbUpdates.is_sold_out = updates.isSoldOut;

        if (Object.keys(dbUpdates).length > 0) {
          const { data, error } = await supabase
            .from("menus")
            .update(dbUpdates)
            .eq("id", itemId)
            .select();

          if (error) {
            throw error;
          }
          if (!data || data.length === 0) {
            throw new Error("업데이트 권한이 없거나 상품을 찾을 수 없습니다.");
          }
        }

        return { success: true };
      } catch (err: any) {
        console.error("[editItem] Supabase update failed:", err);
        updateItemsAndSync(items);
        return {
          success: false,
          error: err.message || "상품 수정(DB 반영)에 실패했습니다.",
        };
      }
    },
    [items, updateItemsAndSync]
  );

  const deleteItem = useCallback(
    async (itemId: string) => {
      const target = items.find((i) => i.id === itemId);
      if (!target) {
        return { success: false, error: "상품을 찾을 수 없습니다." };
      }

      const updated = items.filter((item) => item.id !== itemId);
      updateItemsAndSync(updated);

      try {
        const { data, error } = await supabase.from("menus").delete().eq("id", itemId).select();
        if (error) {
          throw error;
        }
        if (!data || data.length === 0) {
          throw new Error("상품 삭제 권한이 없거나 상품을 찾을 수 없습니다.");
        }
        return { success: true };
      } catch (err: any) {
        console.error("[deleteItem] Supabase update failed:", err);
        updateItemsAndSync(items);
        return {
          success: false,
          error: err.message || "상품 삭제(DB 반영)에 실패했습니다.",
        };
      }
    },
    [items, updateItemsAndSync]
  );

  return {
    items,
    isLoading,
    addItem,
    editItem,
    deleteItem,
    updateStock,
    toggleSoldOut,
  };
}
