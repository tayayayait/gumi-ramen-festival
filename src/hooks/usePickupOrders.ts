import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminSupabase, supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  deriveBarcodeTokenFromOrderNumber,
  generateOrderNumber,
} from "@/lib/barcode-utils";
import type { CartItem } from "./useCart";

export type OrderStatus = "pending" | "ready_for_pickup" | "completed" | "cancelled";
export type RealtimeState = "connecting" | "subscribed" | "error";
export type UpdateOrderStatusResult =
  | { success: true }
  | { success: false; message: string };

export interface PickupOrder {
  id: string;
  orderNumber: string;
  barcodeToken: string;
  items: CartItem[];
  totalAmount: number;
  timeSlotId?: string;
  timeSlotText?: string;
  status: OrderStatus;
  createdAt: string;
  customerName: string;
}

interface UsePickupOrdersOptions {
  isAdmin?: boolean;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type OrderRow = {
  id: string;
  order_number: string;
  barcode_token: string | null;
  total_amount: number;
  time_slot_id: string | null;
  status: OrderStatus;
  created_at: string;
  customer_name: string | null;
  user_id: string | null;
};

type OrderItemRow = {
  order_id: string;
  menu_id: string;
  price_at_time: number;
  quantity: number;
  menus:
    | {
        name: string | null;
        category: string | null;
      }
    | Array<{
        name: string | null;
        category: string | null;
      }>
    | null;
};

export function usePickupOrders(options: UsePickupOrdersOptions = {}) {
  const { isAdmin = false } = options;
  const consumerAuth = useAuth();
  const adminAuth = useAdminAuth();
  const { user } = isAdmin ? adminAuth : consumerAuth;
  const dbClient = useMemo(() => (isAdmin ? adminSupabase : supabase), [isAdmin]);

  const [orders, setOrders] = useState<PickupOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [realtimeState, setRealtimeState] = useState<RealtimeState>("connecting");
  const initialFetchDoneRef = useRef(false);
  const prevUserIdRef = useRef<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!initialFetchDoneRef.current) {
      setIsLoadingOrders(true);
    }

    try {
      let query = dbClient
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (!isAdmin && user?.id) {
        query = query.eq("user_id", user.id);
      } else if (!isAdmin && !user?.id) {
        setOrders([]);
        return;
      }

      const { data: ordersData, error } = await query;
      if (error) {
        throw error;
      }

      const orderRows = (ordersData ?? []) as OrderRow[];
      if (orderRows.length === 0) {
        setOrders([]);
        return;
      }

      const orderIds = orderRows.map((order) => order.id);
      const { data: allItems, error: itemsError } = await dbClient
        .from("order_items")
        .select("*, menus(name, category)")
        .in("order_id", orderIds);

      if (itemsError) {
        throw itemsError;
      }

      const allItemRows = (allItems ?? []) as OrderItemRow[];

      const mappedOrders: PickupOrder[] = orderRows.map((orderRow) => {
        const items = allItemRows
          .filter((itemRow) => itemRow.order_id === orderRow.id)
          .map((itemRow) => {
            const relatedMenu = Array.isArray(itemRow.menus)
              ? itemRow.menus[0]
              : itemRow.menus;

            return {
              menuId: itemRow.menu_id,
              name: relatedMenu?.name || `Menu ${itemRow.menu_id.substring(0, 6)}`,
              price: itemRow.price_at_time,
              quantity: itemRow.quantity,
              category: relatedMenu?.category || "ramyeon",
            };
          });

        const orderNumber = orderRow.order_number;

        return {
          id: orderRow.id,
          orderNumber,
          barcodeToken:
            orderRow.barcode_token || deriveBarcodeTokenFromOrderNumber(orderNumber),
          items,
          totalAmount: orderRow.total_amount,
          timeSlotId: orderRow.time_slot_id ?? undefined,
          status: orderRow.status,
          createdAt: orderRow.created_at,
          customerName: orderRow.customer_name || "Customer",
        };
      });

      setOrders(mappedOrders);
    } catch (err) {
      console.warn("[usePickupOrders] order fetch failed:", err);
    } finally {
      if (!initialFetchDoneRef.current) {
        initialFetchDoneRef.current = true;
        setIsLoadingOrders(false);
      }
    }
  }, [dbClient, isAdmin, user?.id]);

  const refreshOrders = useCallback(async () => {
    await fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const currentUserId = user?.id ?? null;
    if (prevUserIdRef.current !== currentUserId) {
      prevUserIdRef.current = currentUserId;
      initialFetchDoneRef.current = false;
      setIsLoadingOrders(true);
      setRealtimeState("connecting");
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchOrders();
    setRealtimeState("connecting");

    const channel = dbClient
      .channel(`orders_realtime_${isAdmin ? "admin" : user?.id ?? "anon"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        void fetchOrders();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeState("subscribed");
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeState("error");
          void fetchOrders();
          return;
        }

        if (status === "CLOSED") {
          setRealtimeState("connecting");
        }
      });

    const pollIntervalMs = isAdmin ? 10_000 : 5_000;
    const pollInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchOrders();
      }
    }, pollIntervalMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchOrders();
      }
    };

    const handleFocus = () => {
      void fetchOrders();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      void dbClient.removeChannel(channel);
      window.clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [dbClient, fetchOrders, isAdmin, user?.id]);

  const createOrder = useCallback(
    async (
      cartItems: CartItem[],
      totalAmount: number,
      customerName: string = "Customer",
      timeSlotId?: string,
      timeSlotText?: string
    ): Promise<PickupOrder> => {
      const orderNumber = generateOrderNumber();
      const barcodeToken = deriveBarcodeTokenFromOrderNumber(orderNumber);
      const invalidMenuItem = cartItems.find((item) => !UUID_PATTERN.test(item.menuId));

      if (invalidMenuItem) {
        throw new Error(`Invalid menu id for RPC: ${invalidMenuItem.menuId}`);
      }

      if (!timeSlotId || !UUID_PATTERN.test(timeSlotId)) {
        throw new Error("Pickup time slot must be a valid UUID.");
      }

      const { data: slotRow, error: slotError } = await dbClient
        .from("time_slots")
        .select("shop_id")
        .eq("id", timeSlotId)
        .maybeSingle();

      if (slotError) {
        throw new Error(`Failed to resolve slot shop id: ${slotError.message}`);
      }

      const shopId = slotRow?.shop_id;
      if (!shopId || !UUID_PATTERN.test(shopId)) {
        throw new Error("Selected pickup time slot does not contain a valid shop id.");
      }

      const itemsPayload = cartItems.map((item) => ({
        menu_id: item.menuId,
        quantity: item.quantity,
        price: item.price,
      }));

      const { data: rpcData, error } = await dbClient.rpc("create_pickup_order", {
        p_order_number: orderNumber,
        p_shop_id: shopId,
        p_time_slot_id: timeSlotId,
        p_customer_name: customerName,
        p_total_amount: totalAmount,
        p_items: itemsPayload,
      });

      if (error) {
        throw new Error(error.message);
      }

      const orderId = rpcData?.order_id;
      if (!orderId || typeof orderId !== "string") {
        throw new Error("create_pickup_order did not return a valid order id.");
      }

      const order: PickupOrder = {
        id: orderId,
        orderNumber,
        barcodeToken,
        items: [...cartItems],
        totalAmount,
        timeSlotId,
        timeSlotText,
        status: "pending",
        createdAt: new Date().toISOString(),
        customerName,
      };

      setOrders((prev) => [order, ...prev]);
      return order;
    },
    [dbClient]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus): Promise<UpdateOrderStatusResult> => {
      const prevStatus = orders.find((order) => order.id === orderId)?.status ?? null;

      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? { ...order, status } : order))
      );

      try {
        const { data, error } = await dbClient
          .from("orders")
          .update({ status })
          .eq("id", orderId)
          .select("id,status")
          .single();

        if (error) {
          if (prevStatus) {
            setOrders((prev) =>
              prev.map((order) =>
                order.id === orderId ? { ...order, status: prevStatus as OrderStatus } : order
              )
            );
          }
          return { success: false, message: error.message };
        }

        if (!data) {
          if (prevStatus) {
            setOrders((prev) =>
              prev.map((order) =>
                order.id === orderId ? { ...order, status: prevStatus as OrderStatus } : order
              )
            );
          }
          return { success: false, message: "Order update did not return data." };
        }

        return { success: true };
      } catch (err) {
        if (prevStatus) {
          setOrders((prev) =>
            prev.map((order) =>
              order.id === orderId ? { ...order, status: prevStatus as OrderStatus } : order
            )
          );
        }

        return {
          success: false,
          message:
            err instanceof Error
              ? err.message
              : "Unknown error occurred while updating order status.",
        };
      }
    },
    [dbClient, orders]
  );

  const getOrderByBarcode = useCallback(
    (barcodeToken: string): PickupOrder | undefined => {
      return orders.find((order) => order.barcodeToken === barcodeToken);
    },
    [orders]
  );

  const getOrderById = useCallback(
    (orderId: string): PickupOrder | undefined => {
      return orders.find((order) => order.id === orderId);
    },
    [orders]
  );

  return {
    orders,
    isLoadingOrders,
    realtimeState,
    refreshOrders,
    createOrder,
    updateOrderStatus,
    getOrderByBarcode,
    getOrderById,
  };
}
