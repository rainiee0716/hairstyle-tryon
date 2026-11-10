// POST /api/payments/stripe/checkout — 创建 Checkout Session（price_data 内联报价，无需在 Stripe 后台建商品）
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getEnv, siteOrigin } from "@/lib/env";
import { getSessionUser } from "@/lib/session";
import { getPack } from "@/lib/packs";
import { stripeApi, type StripeSession } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json(
      { error: "unauthenticated", message: "Sign in to buy credits.", redirectTo: "/login?next=%2Fpricing" },
      { status: 401 }
    );
  }

  if (!getEnv("STRIPE_SECRET_KEY")) {
    return NextResponse.json({ error: "not_configured", message: "Stripe is not configured." }, { status: 500 });
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

  const origin = siteOrigin(req.nextUrl.origin);
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("client_reference_id", String(user.userId));
  params.set("metadata[user_id]", String(user.userId));
  params.set("metadata[pack_id]", pack.id);
  params.set("metadata[credits]", String(pack.credits));
  params.set("success_url", `${origin}/pricing?stripe=success&session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${origin}/pricing?stripe=cancelled`);
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", "usd");
  params.set("line_items[0][price_data][unit_amount]", String(pack.priceCents));
  params.set("line_items[0][price_data][product_data][name]", `${pack.credits} Hairstyle Try On credits`);

  let session: StripeSession;
  try {
    session = await stripeApi<StripeSession>("POST", "/v1/checkout/sessions", params);
  } catch (e: unknown) {
    console.error("stripe checkout failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "checkout_failed", message: "Could not start checkout, please try again." }, { status: 502 });
  }

  // 先记 created，webhook/verify 置 paid（幂等以 provider_order_id 唯一约束兜底）
  const db = getDb();
  await db
    .prepare(
      `INSERT OR IGNORE INTO purchases
         (user_id, provider, provider_order_id, pack_id, credits, amount_cents, status)
       VALUES (?, 'stripe', ?, ?, ?, ?, 'created')`
    )
    .bind(user.userId, session.id, pack.id, pack.credits, pack.priceCents)
    .run();

  return NextResponse.json({ url: session.url });
}
