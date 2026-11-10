// GET /api/payments/stripe/verify?session_id=... — 支付成功回跳后的兜底入账
// （主通道是 webhook；这里再查一次 session，避免 webhook 延迟导致积分没到账）
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getSessionUser } from "@/lib/session";
import { getPack } from "@/lib/packs";
import { markPurchasePaid } from "@/lib/credits";
import { stripeApi, type StripeSession } from "@/lib/stripe";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!getEnv("STRIPE_SECRET_KEY")) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const sessionId = req.nextUrl.searchParams.get("session_id") || "";
  if (!sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "bad session_id" }, { status: 400 });
  }

  let session: StripeSession;
  try {
    session = await stripeApi<StripeSession>("GET", `/v1/checkout/sessions/${sessionId}`);
  } catch (e: unknown) {
    console.error("stripe verify failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "verify_failed" }, { status: 502 });
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json({ paid: false });
  }

  // 校验会话确实属于当前登录用户，防止拿别人的 session_id 触发入账
  const ownerId = Number(session.metadata?.user_id || session.client_reference_id);
  if (ownerId !== user.userId) {
    return NextResponse.json({ paid: false, error: "mismatch" }, { status: 403 });
  }

  const pack = getPack(session.metadata?.pack_id || "");
  const credits = Number(session.metadata?.credits || 0);
  if (!pack || credits !== pack.credits) {
    console.error("stripe verify: unknown pack in metadata", session.metadata);
    return NextResponse.json({ paid: false, error: "bad metadata" }, { status: 400 });
  }

  const db = getDb();
  const r = await markPurchasePaid(db, {
    userId: user.userId,
    provider: "stripe",
    providerOrderId: session.id,
    packId: pack.id,
    credits: pack.credits,
    amountCents: session.amount_total ?? pack.priceCents,
  });
  return NextResponse.json({ paid: true, credited: r.credited, credits: r.balance });
}
