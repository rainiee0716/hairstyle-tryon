// POST /api/payments/paypal/capture — 客户端批准后服务端 capture 并入账
// capture 响应即权威凭证（MVP 不依赖 webhook），金额必须与库里订单一致才放行。
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getSessionUser } from "@/lib/session";
import { markPurchasePaid } from "@/lib/credits";
import { paypalApi, type PayPalCapture } from "@/lib/paypal";

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!getEnv("PAYPAL_CLIENT_ID")) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  let body: { orderId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const orderId = body.orderId || "";
  if (!orderId.startsWith("ORDER") && orderId.length < 8) {
    // PayPal 订单号形如 8XY12345AB678901C，格式宽松校验长度即可
    return NextResponse.json({ error: "bad order id" }, { status: 400 });
  }

  const db = getDb();
  const purchase = await db
    .prepare("SELECT id, user_id, status, amount_cents, pack_id, credits FROM purchases WHERE provider_order_id = ? AND provider = 'paypal'")
    .bind(orderId)
    .first<{ id: number; user_id: number; status: string; amount_cents: number; pack_id: string; credits: number }>();

  if (!purchase) {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }
  if (purchase.user_id !== user.userId) {
    return NextResponse.json({ error: "mismatch" }, { status: 403 });
  }

  let capture: PayPalCapture;
  try {
    capture = await paypalApi<PayPalCapture>("POST", `/v2/checkout/orders/${orderId}/capture`);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("paypal capture failed:", message);
    // 买家付款方式被拒时给可读提示
    const declined = message.includes("INSTRUMENT_DECLINED") || message.includes("422");
    return NextResponse.json(
      { error: "capture_failed", message: declined ? "PayPal declined the payment, try another method." : "Could not capture the PayPal payment." },
      { status: 502 }
    );
  }

  if (capture.status !== "COMPLETED") {
    return NextResponse.json({ error: "not_completed", message: "PayPal order was not completed." }, { status: 502 });
  }
  const captured = capture.purchase_units?.[0]?.payments?.captures?.[0];
  const expected = (purchase.amount_cents / 100).toFixed(2);
  if (captured?.status !== "COMPLETED" || captured.amount?.value !== expected) {
    console.error("paypal capture mismatch:", orderId, captured?.amount?.value, "expected", expected);
    return NextResponse.json({ error: "capture_mismatch", message: "Payment amount mismatch, contact support." }, { status: 502 });
  }

  const r = await markPurchasePaid(db, {
    userId: user.userId,
    provider: "paypal",
    providerOrderId: orderId,
    packId: purchase.pack_id,
    credits: purchase.credits,
    amountCents: purchase.amount_cents,
  });
  return NextResponse.json({ ok: true, credited: r.credited, credits: r.balance });
}
