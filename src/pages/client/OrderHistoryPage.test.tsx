import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OrderHistoryPage from "@/pages/client/OrderHistoryPage";
import { usePickupOrders, type PickupOrder } from "@/hooks/usePickupOrders";
import { useNavigate, type NavigateFunction } from "react-router-dom";

vi.mock("@/hooks/usePickupOrders", () => ({
  usePickupOrders: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: vi.fn(),
}));

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <div data-testid="order-history-qr" data-value={value} />
  ),
}));

type HookResult = ReturnType<typeof usePickupOrders>;

const createHookMockValue = (overrides: Partial<HookResult> = {}): HookResult => {
  const createOrder: HookResult["createOrder"] = async () => {
    throw new Error("not used in this test");
  };
  const updateOrderStatus: HookResult["updateOrderStatus"] = async () => ({ success: true });
  const getOrderByBarcode: HookResult["getOrderByBarcode"] = () => undefined;
  const getOrderById: HookResult["getOrderById"] = () => undefined;
  const refreshOrders: HookResult["refreshOrders"] = async () => {};

  return {
    orders: [],
    isLoadingOrders: false,
    realtimeState: "subscribed",
    refreshOrders,
    createOrder,
    updateOrderStatus,
    getOrderByBarcode,
    getOrderById,
    ...overrides,
  };
};

const buildOrder = (
  id: string,
  status: PickupOrder["status"],
  barcodeToken: string
): PickupOrder => ({
  id,
  orderNumber: id === "order-pending" ? "ORD-20260221-170" : "ORD-20260221-171",
  barcodeToken,
  items: [
    {
      menuId: "menu-1",
      name: "Shin",
      price: 5000,
      quantity: 1,
      category: "ramyeon",
    },
  ],
  totalAmount: 5000,
  status,
  createdAt: "2026-02-21T08:44:25.000Z",
  customerName: "Test",
});

describe("OrderHistoryPage", () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(
      mockNavigate as unknown as NavigateFunction
    );
  });

  it("shows QR toggle for pending/ready orders and renders QR when expanded", () => {
    vi.mocked(usePickupOrders).mockReturnValue(
      createHookMockValue({
        orders: [
          buildOrder("order-pending", "pending", "PU-ORD-20260221-170"),
        ],
      })
    );

    render(<OrderHistoryPage />);

    const toggleButton = screen.getByTestId("order-qr-toggle-order-pending");
    fireEvent.click(toggleButton);

    expect(screen.getByTestId("order-qr-panel-order-pending")).toBeInTheDocument();
    expect(screen.getByTestId("order-history-qr")).toHaveAttribute(
      "data-value",
      "PU-ORD-20260221-170"
    );
  });

  it("does not render QR toggle for completed orders", () => {
    vi.mocked(usePickupOrders).mockReturnValue(
      createHookMockValue({
        orders: [
          buildOrder("order-completed", "completed", "PU-ORD-20260221-171"),
        ],
      })
    );

    render(<OrderHistoryPage />);

    expect(
      screen.queryByTestId("order-qr-toggle-order-completed")
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("order-qr-expired-order-completed")).toBeInTheDocument();
  });
});
