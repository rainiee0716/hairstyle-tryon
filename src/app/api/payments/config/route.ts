// GET /api/payments/config — pricing 页用它决定渲染哪些支付按钮
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    stripe: Boolean(getEnv("STRIPE_SECRET_KEY")),
    paypalClientId: getEnv("PAYPAL_CLIENT_ID") || null,
    paypalEnv: getEnv("PAYPAL_ENV") || "sandbox",
  });
}
