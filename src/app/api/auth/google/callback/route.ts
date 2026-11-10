import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getEnv, siteOrigin } from "@/lib/env";
import { createSessionToken, setSessionCookie } from "@/lib/session";

// GET /api/auth/google/callback?code=...&state=... —— 换取用户信息并建会话
function constantEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Google 返回的 id_token 是 TLS 直连 token 端点拿到的，可信任来源；
 *  这里只解 payload 做 aud/过期/邮箱校验，不做签名验证。 */
function decodeJwtPayload(idToken: string): Record<string, unknown> | null {
  try {
    const part = idToken.split(".")[1];
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const stateCookie = req.cookies.get("hto_oauth_state")?.value || "";
  const [expectedState, next = "/"] = stateCookie.split("::");

  if (!code || !state || !constantEquals(state, expectedState)) {
    return NextResponse.redirect(`${siteOrigin(req.nextUrl.origin)}/login?error=state`);
  }

  const clientId = getEnv("GOOGLE_CLIENT_ID");
  const clientSecret = getEnv("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${siteOrigin(req.nextUrl.origin)}/login?error=config`);
  }

  // 换 token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${siteOrigin(req.nextUrl.origin)}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    console.error("google token exchange failed:", (await tokenRes.text()).slice(0, 300));
    return NextResponse.redirect(`${siteOrigin(req.nextUrl.origin)}/login?error=token`);
  }
  const tokens = (await tokenRes.json()) as { id_token?: string };
  const payload = tokens.id_token ? decodeJwtPayload(tokens.id_token) : null;
  if (!payload || payload.aud !== clientId || !payload.sub || !payload.email) {
    return NextResponse.redirect(`${siteOrigin(req.nextUrl.origin)}/login?error=idtoken`);
  }
  const email = String(payload.email);
  if (payload.email_verified === false) {
    return NextResponse.redirect(`${siteOrigin(req.nextUrl.origin)}/login?error=unverified`);
  }
  const name = payload.name ? String(payload.name) : undefined;
  const picture = payload.picture ? String(payload.picture) : undefined;

  // upsert 用户
  const db = getDb();
  const googleSub = String(payload.sub);
  const existing = await db
    .prepare("SELECT id, email FROM users WHERE google_sub = ?")
    .bind(googleSub)
    .first<{ id: number; email: string }>();

  let userId: number;
  if (existing) {
    userId = existing.id;
    if (existing.email !== email) {
      await db.prepare("UPDATE users SET email = ? WHERE id = ?").bind(email, userId).run();
    }
  } else {
    const sameEmail = await db
      .prepare("SELECT id FROM users WHERE email = ?")
      .bind(email)
      .first<{ id: number }>();
    if (sameEmail) {
      userId = sameEmail.id;
      await db
        .prepare("UPDATE users SET google_sub = ?, name = COALESCE(?, name), avatar_url = COALESCE(?, avatar_url) WHERE id = ?")
        .bind(googleSub, name ?? null, picture ?? null, userId)
        .run();
    } else {
      const ins = await db
        .prepare("INSERT INTO users (email, name, avatar_url, google_sub) VALUES (?, ?, ?, ?)")
        .bind(email, name ?? null, picture ?? null, googleSub)
        .run();
      userId = ins.meta.last_row_id;
    }
  }

  const token = await createSessionToken({ userId, email, name });
  const res = NextResponse.redirect(`${siteOrigin(req.nextUrl.origin)}${next}`);
  setSessionCookie(res, token);
  res.cookies.set("hto_oauth_state", "", { maxAge: 0, path: "/" });
  return res;
}
