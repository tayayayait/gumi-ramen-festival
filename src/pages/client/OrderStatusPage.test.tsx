import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OrderStatusPage from "@/pages/client/OrderStatusPage";
import { usePickupOrders, type PickupOrder } from "@/hooks/usePickupOrders";
import {
  useNavigate,
  useParams,
  type NavigateFunction,
} from "react-router-dom";

vi.mock("@/hooks/usePickupOrders", () => ({
  usePickupOrders: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useParams: vi.fn(),
  useNavigate: vi.fn(),
}));

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <div data-testid="order-status-qr" data-value={value} />
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

const buildOrder = (status: PickupOrder["status"]): PickupOrder => ({
  id: "order-1",
  orderNumber: "ORD-20260221-170",
  barcodeToken: "PU-ORD-20260221-170",
  items: [],
  totalAmount: 10000,
  status,
  createdAt: "2026-02-21T08:44:25.000Z",
  customerName: "Test",
});

describe("OrderStatusPage", () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(
      mockNavigate as unknown as NavigateFunction
    );
    vi.mocked(useParams).mockReturnValue(
      { orderId: "order-1" } as unknown as ReturnType<typeof useParams>
    );
  });

  it("shows loading UI while orders are still loading", () => {
    vi.mocked(usePickupOrders).mockReturnValue(
      createHookMockValue({ isLoadingOrders: true })
    );

    render(<OrderStatusPage />);

    expect(screen.getByTestId("order-status-loading")).toBeInTheDocument();
  });

  it("renders QR using order.barcodeToken for pending/ready orders", () => {
    vi.mocked(usePickupOrders).mockReturnValue(
      createHookMockValue({
        getOrderById: () => buildOrder("pending"),
      })
    );

    render(<OrderStatusPage />);

    expect(screen.getByTestId("order-status-live-qr")).toBeInTheDocument();
    expect(screen.getByTestId("order-status-qr")).toHaveAttribute(
      "data-value",
      "PU-ORD-20260221-170"
    );
  });

  it("hides QR for completed orders", () => {
    vi.mocked(usePickupOrders).mockReturnValue(
      createHookMockValue({
        getOrderById: () => buildOrder("completed"),
      })
    );

    render(<OrderStatusPage />);

    expect(screen.queryByTestId("order-status-qr")).not.toBeInTheDocument();
    expect(screen.getByTestId("order-status-expired-qr")).toBeInTheDocument();
  });
});
