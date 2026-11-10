// PayPal 对接：服务端走 REST API（OAuth2 token + orders create/capture），
// 客户端用官方 JS SDK 渲染按钮。MVP 不依赖 webhook（capture 响应即权威凭证）。
import { getEnv } from "./env";

export function paypalApiBase(): string {
  return (getEnv("PAYPAL_ENV") || "sandbox") === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function paypalAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.token;
  const id = getEnv("PAYPAL_CLIENT_ID");
  const secret = getEnv("PAYPAL_CLIENT_SECRET");
  if (!id || !secret) throw new Error("PAYPAL_CLIENT_ID/SECRET not set");
  const res = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    throw new Error(`paypal token ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: j.access_token, expiresAt: Date.now() + j.expires_in * 1000 };
  return j.access_token;
}

export async function paypalApi<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown
): Promise<T> {
  const token = await paypalAccessToken();
  const res = await fetch(`${paypalApiBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`paypal ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

export type PayPalOrder = { id: string; status?: string };
export type PayPalCapture = {
  id: string;
  status?: string;
  purchase_units?: {
    payments?: { captures?: { id: string; status?: string; amount?: { value?: string } }[] };
  }[];
};
