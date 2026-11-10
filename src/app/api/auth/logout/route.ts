import { NextRequest, NextResponse } from "next/server";
import { siteOrigin } from "@/lib/env";
import { clearSessionCookie } from "@/lib/session";

// GET /api/auth/logout —— 清会话并回首页
export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(`${siteOrigin(req.nextUrl.origin)}/`);
  clearSessionCookie(res);
  return res;
}
