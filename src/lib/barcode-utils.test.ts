import { describe, expect, it } from "vitest";
import { deriveBarcodeTokenFromOrderNumber } from "@/lib/barcode-utils";

describe("deriveBarcodeTokenFromOrderNumber", () => {
  it("returns deterministic barcode token for the same order number", () => {
    const orderNumber = "ORD-20260221-170";

    const first = deriveBarcodeTokenFromOrderNumber(orderNumber);
    const second = deriveBarcodeTokenFromOrderNumber(orderNumber);

    expect(first).toBe("PU-ORD-20260221-170");
    expect(second).toBe(first);
  });
});

