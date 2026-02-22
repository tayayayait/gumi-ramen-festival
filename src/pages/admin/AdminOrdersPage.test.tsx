import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminOrdersPage from "@/pages/admin/AdminOrdersPage";
import { usePickupOrders, type PickupOrder } from "@/hooks/usePickupOrders";
import { useToast } from "@/components/ui/use-toast";

vi.mock("@/hooks/usePickupOrders", () => ({
  usePickupOrders: vi.fn(),
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: vi.fn(),
}));

vi.mock("@/components/admin/QRScanner", () => ({
  QRScanner: () => <div data-testid="admin-qr-scanner" />,
}));

const buildOrder = (): PickupOrder => ({
  id: "order-1",
  orderNumber: "ORD-20260222-249",
  barcodeToken: "PU-ORD-20260222-249",
  items: [
    {
      menuId: "menu-1",
      name: "Shin",
      price: 4500,
      quantity: 1,
      category: "ramyeon",
    },
  ],
  totalAmount: 4500,
  status: "pending",
  createdAt: "2026-02-22T10:00:00.000Z",
  customerName: "1234123",
});

describe("AdminOrdersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps pending action and shows error toast when status update fails", async () => {
    const updateOrderStatus = vi.fn().mockResolvedValue({
      success: false,
      message: "permission denied",
    });
    const toast = vi.fn();

    vi.mocked(useToast).mockReturnValue({ toast } as never);
    vi.mocked(usePickupOrders).mockReturnValue({
      orders: [buildOrder()],
      isLoadingOrders: false,
      realtimeState: "subscribed",
      refreshOrders: vi.fn(),
      createOrder: vi.fn(),
      updateOrderStatus,
      getOrderByBarcode: vi.fn(),
      getOrderById: vi.fn(),
    } as never);

    render(<AdminOrdersPage />);

    fireEvent.click(screen.getByTestId("admin-order-mark-ready-order-1"));

    await waitFor(() => {
      expect(updateOrderStatus).toHaveBeenCalledWith("order-1", "ready_for_pickup");
    });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "주문 상태 변경 실패",
        variant: "destructive",
      })
    );
    expect(screen.getByTestId("admin-order-mark-ready-order-1")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-order-mark-complete-order-1")).not.toBeInTheDocument();
  });
});
