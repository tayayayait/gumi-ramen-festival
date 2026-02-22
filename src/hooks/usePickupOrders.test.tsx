import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePickupOrders } from "@/hooks/usePickupOrders";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/lib/supabase";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/contexts/AdminAuthContext", () => ({
  useAdminAuth: vi.fn(),
}));

vi.mock("@/lib/supabase", () => {
  const mockClient = {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
    rpc: vi.fn(),
  };
  return {
    supabase: mockClient,
    adminSupabase: mockClient,
    consumerSupabase: mockClient,
  };
});

type OrderRow = {
  id: string;
  order_number: string;
  barcode_token: string | null;
  total_amount: number;
  time_slot_id: string | null;
  status: "pending" | "ready_for_pickup" | "completed" | "cancelled";
  created_at: string;
  customer_name: string | null;
  user_id: string | null;
};

type OrderItemRow = {
  order_id: string;
  menu_id: string;
  price_at_time: number;
  quantity: number;
  menus: { name: string; category: string };
};

describe("usePickupOrders", () => {
  let orderRows: OrderRow[];
  let orderItemRows: OrderItemRow[];
  let updateResponses: Array<{ data: unknown; error: { message: string } | null }>;
  let orderFetchCount: number;
  let realtimeCallback: (() => void) | null;

  beforeEach(() => {
    vi.clearAllMocks();

    orderRows = [
      {
        id: "order-1",
        order_number: "ORD-20260222-101",
        barcode_token: "PU-ORD-20260222-101",
        total_amount: 4500,
        time_slot_id: null,
        status: "pending",
        created_at: "2026-02-22T12:00:00.000Z",
        customer_name: "테스트",
        user_id: "user-1",
      },
    ];

    orderItemRows = [
      {
        order_id: "order-1",
        menu_id: "menu-1",
        price_at_time: 4500,
        quantity: 1,
        menus: { name: "Shin", category: "ramyeon" },
      },
    ];

    updateResponses = [];
    orderFetchCount = 0;
    realtimeCallback = null;

    vi.mocked(useAuth).mockReturnValue({
      user: { id: "admin-1" },
      loading: false,
    } as never);
    vi.mocked(useAdminAuth).mockReturnValue({
      user: { id: "admin-1" },
      loading: false,
    } as never);

    (supabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (table: string) => {
        if (table === "orders") {
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(async () => {
                  orderFetchCount += 1;
                  return {
                    data: orderRows.map((row) => ({ ...row })),
                    error: null,
                  };
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(async () => {
                    const next =
                      updateResponses.shift() ?? {
                        data: { id: "order-1", status: "ready_for_pickup" },
                        error: null,
                      };
                    return { data: next.data, error: next.error };
                  }),
                })),
              })),
            })),
          };
        }

        if (table === "order_items") {
          return {
            select: vi.fn(() => ({
              in: vi.fn(async () => ({
                data: orderItemRows.map((row) => ({ ...row })),
                error: null,
              })),
            })),
          };
        }

        return {
          select: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: null, error: null })),
          })),
        };
      }
    );

    (supabase.channel as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => {
        const channel = {
          on: vi.fn((_event, _filter, callback: () => void) => {
            realtimeCallback = callback;
            return channel;
          }),
          subscribe: vi.fn((statusHandler?: (status: string) => void) => {
            statusHandler?.("SUBSCRIBED");
            return channel;
          }),
        };
        return channel;
      }
    );

    (supabase.removeChannel as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined
    );
  });

  it("returns success on update and rolls back when update fails", async () => {
    const { result } = renderHook(() => usePickupOrders({ isAdmin: true }));

    await waitFor(() => {
      expect(result.current.orders[0]?.status).toBe("pending");
      expect(result.current.realtimeState).toBe("subscribed");
    });

    updateResponses.push({
      data: { id: "order-1", status: "ready_for_pickup" },
      error: null,
    });

    let successResult: Awaited<ReturnType<typeof result.current.updateOrderStatus>> | null =
      null;
    await act(async () => {
      successResult = await result.current.updateOrderStatus(
        "order-1",
        "ready_for_pickup"
      );
    });

    expect(successResult).toEqual({ success: true });
    expect(result.current.orders[0]?.status).toBe("ready_for_pickup");

    updateResponses.push({
      data: null,
      error: { message: "permission denied" },
    });

    let failResult: Awaited<ReturnType<typeof result.current.updateOrderStatus>> | null = null;
    await act(async () => {
      failResult = await result.current.updateOrderStatus("order-1", "completed");
    });

    expect(failResult).toEqual({
      success: false,
      message: "permission denied",
    });
    expect(result.current.orders[0]?.status).toBe("ready_for_pickup");
  });

  it("refreshes orders when realtime callback is triggered", async () => {
    const { result } = renderHook(() => usePickupOrders({ isAdmin: true }));

    await waitFor(() => {
      expect(result.current.orders[0]?.status).toBe("pending");
    });
    const initialFetchCount = orderFetchCount;

    orderRows[0].status = "ready_for_pickup";

    await act(async () => {
      realtimeCallback?.();
    });

    await waitFor(() => {
      expect(result.current.orders[0]?.status).toBe("ready_for_pickup");
    });
    expect(orderFetchCount).toBeGreaterThan(initialFetchCount);
  });
});
