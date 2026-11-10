// POST /api/webhooks/stripe — 入账主通道（checkout.session.completed）
// 必须用原始 body 验签，这里 req.text() 拿原文，验签通过后再 JSON.parse。
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getPack } from "@/lib/packs";
import { markPurchasePaid } from "@/lib/credits";
import { verifyStripeSignature } from "@/lib/stripe";

type StripeEvent = {
  type: string;
  data: {
    object: {
      id: string;
      payment_status?: string;
      amount_total?: number;
      client_reference_id?: string | null;
      metadata?: Record<string, string>;
    };
  };
};

export async function POST(req: NextRequest) {
  const secret = getEnv("STRIPE_WEBHOOK_SECRET");
  if (!secret) {
    return new NextResponse("STRIPE_WEBHOOK_SECRET not configured", { status: 500 });
  }

  const raw = await req.text();
  const sig = req.headers.get("stripe-signature") || "";
  if (!(await verifyStripeSignature(raw, sig, secret))) {
    return new NextResponse("invalid signature", { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(raw) as StripeEvent;
  } catch {
    return new NextResponse("bad payload", { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object;
    if (session.payment_status && session.payment_status !== "paid") {
      return NextResponse.json({ received: true, skipped: "unpaid" });
    }

    const userId = Number(session.metadata?.user_id || session.client_reference_id);
    const pack = getPack(session.metadata?.pack_id || "");
    const credits = Number(session.metadata?.credits || 0);
    if (!userId || !pack || credits !== pack.credits) {
      console.error("stripe webhook: bad metadata for session", session.id);
      return NextResponse.json({ received: true, skipped: "bad metadata" });
    }

    const db = getDb();
    await markPurchasePaid(db, {
      userId,
      provider: "stripe",
      providerOrderId: session.id,
      packId: pack.id,
      credits: pack.credits,
      amountCents: session.amount_total ?? pack.priceCents,
    });
  }

  return NextResponse.json({ received: true });
}
