import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ConfirmPaymentBody = {
  paymentKey?: string;
  orderId?: string;
  amount?: number;
};

const jsonResponse = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { success: false, error: "Method not allowed" });
  }

  try {
    const body = (await req.json()) as ConfirmPaymentBody;
    const paymentKey = body.paymentKey?.trim();
    const orderId = body.orderId?.trim();
    const amount = body.amount;

    if (!paymentKey || !orderId || typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return jsonResponse(400, { success: false, error: "Invalid payment confirmation payload" });
    }

    const secretKey = Deno.env.get("TOSS_SECRET_KEY") ?? Deno.env.get("VITE_TOSS_SECRET_KEY");
    if (!secretKey) {
      return jsonResponse(500, {
        success: false,
        error: "TOSS_SECRET_KEY is not configured in Edge Function secrets.",
      });
    }

    const tossResponse = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${secretKey}:`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount,
      }),
    });

    const tossPayload = await tossResponse.json().catch(() => null);
    if (!tossResponse.ok) {
      return jsonResponse(tossResponse.status, {
        success: false,
        code: tossPayload?.code ?? "TOSS_CONFIRM_FAILED",
        error: tossPayload?.message ?? "Failed to confirm Toss payment.",
      });
    }

    return jsonResponse(200, {
      success: true,
      payment: tossPayload,
    });
  } catch (error) {
    return jsonResponse(500, {
      success: false,
      error: error instanceof Error ? error.message : "Unexpected server error",
    });
  }
});
