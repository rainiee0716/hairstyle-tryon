// 会话：JWT（HS256）放在 httpOnly cookie 里，每个请求零 DB 查询——
// Workers 免费版 10ms CPU 限制下，避免每请求查库。
import { SignJWT, jwtVerify } from "jose";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest, NextResponse } from "next/server";
import { isProd } from "./env";

export const SESSION_COOKIE = "hto_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 天

export type SessionUser = {
  userId: number;
  email: string;
  name?: string;
};

function getSecretKey(): Uint8Array {
  let secret = process.env.AUTH_SECRET;
  if (!secret) {
    try {
      secret = (getCloudflareContext().env as Record<string, string | undefined>).AUTH_SECRET;
    } catch {
      // 非 request 上下文
    }
  }
  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not set. Copy .dev.vars.example to .dev.vars and set a long random string."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return await new SignJWT({ email: user.email, name: user.name ?? "" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.userId))
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const userId = Number(payload.sub);
    if (!userId) return null;
    return {
      userId,
      email: String(payload.email ?? ""),
      name: (payload.name as string) || undefined,
    };
  } catch {
    return null;
  }
}

export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd(),
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd(),
    maxAge: 0,
    path: "/",
  });
}
