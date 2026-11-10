// POST /api/payments/paypal/order — 创建 PayPal 订单（服务端定价，不信任客户端金额）
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getSessionUser } from "@/lib/session";
import { getPack } from "@/lib/packs";
import { paypalApi, type PayPalOrder } from "@/lib/paypal";

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json(
      { error: "unauthenticated", message: "Sign in to buy credits.", redirectTo: "/login?next=%2Fpricing" },
      { status: 401 }
    );
  }
  if (!getEnv("PAYPAL_CLIENT_ID") || !getEnv("PAYPAL_CLIENT_SECRET")) {
    return NextResponse.json({ error: "not_configured", message: "PayPal is not configured." }, { status: 500 });
  }

  let body: { packId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const pack = getPack(body.packId || "");
  if (!pack) {
    return NextResponse.json({ error: "unknown pack" }, { status: 400 });
  }

  let order: PayPalOrder;
  try {
    order = await paypalApi<PayPalOrder>("POST", "/v2/checkout/orders", {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: pack.id,
          description: `${pack.credits} Hairstyle Try On credits`,
          amount: { currency_code: "USD", value: (pack.priceCents / 100).toFixed(2) },
          custom_id: String(user.userId),
        },
      ],
    });
  } catch (e: unknown) {
    console.error("paypal order failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "order_failed", message: "Could not start PayPal checkout." }, { status: 502 });
  }

  const db = getDb();
  await db
    .prepare(
      `INSERT OR IGNORE INTO purchases
         (user_id, provider, provider_order_id, pack_id, credits, amount_cents, status)
       VALUES (?, 'paypal', ?, ?, ?, ?, 'created')`
    )
    .bind(user.userId, order.id, pack.id, pack.credits, pack.priceCents)
    .run();

  return NextResponse.json({ orderId: order.id });
}
