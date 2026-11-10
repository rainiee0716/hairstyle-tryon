import { NextRequest, NextResponse } from "next/server";
import { getEnv, siteOrigin } from "@/lib/env";

// GET /api/auth/google/start?next=/pricing —— 跳 Google 授权页
export async function GET(req: NextRequest) {
  const clientId = getEnv("GOOGLE_CLIENT_ID");
  if (!clientId) {
    return new NextResponse(
      "Google login is not configured yet (missing GOOGLE_CLIENT_ID). See DEPLOY.md.",
      { status: 500 }
    );
  }

  // next 参数只允许站内路径，防开放重定向
  const rawNext = req.nextUrl.searchParams.get("next") || "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  const state = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", `${siteOrigin(req.nextUrl.origin)}/api/auth/google/callback`);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set("hto_oauth_state", `${state}::${next}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return res;
}
