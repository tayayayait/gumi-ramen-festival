/**
 * Barcode and order-number utilities.
 */

/** Create a random barcode token (legacy helper). */
export function generateBarcodeToken(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PU-${timestamp}-${random}`;
}

/** Order number format: ORD-YYYYMMDD-XXX */
export function generateOrderNumber(): string {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const seq = Math.floor(Math.random() * 900 + 100);
  return `ORD-${date}-${seq}`;
}

/** Derive deterministic pickup barcode token from order number. */
export function deriveBarcodeTokenFromOrderNumber(orderNumber: string): string {
  return `PU-${orderNumber}`;
}

/** Validate random barcode token format. */
export function isValidBarcodeToken(token: string): boolean {
  return /^PU-[A-Z0-9]+-[A-Z0-9]{4}$/.test(token);
}
