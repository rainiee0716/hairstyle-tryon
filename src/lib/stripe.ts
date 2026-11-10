// Stripe 对接：不用 stripe-node SDK（省 worker 体积、避免 Workers 兼容问题），
// 直接走 REST v1 + 官方 webhook 签名验证算法（HMAC-SHA256，hex）。
import { getEnv } from "./env";

export type StripeSession = {
  id: string;
  url?: string;
  payment_status?: string;
  amount_total?: number;
  client_reference_id?: string | null;
  metadata?: Record<string, string>;
};

export async function stripeApi<T>(
  method: "GET" | "POST",
  path: string,
  params?: URLSearchParams
): Promise<T> {
  const key = getEnv("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  const res = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(params ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: params ? params.toString() : undefined,
  });
  if (!res.ok) {
    throw new Error(`stripe ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

/** 官方验签：signed_payload = `${t}.${rawBody}`，HMAC-SHA256 后与 v1（hex）常数时间比较，时间戳容差 10 分钟 */
export async function verifyStripeSignature(
  rawBody: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  const parts = sigHeader.split(",").map((s) => s.trim().split("="));
  const t = parts.find((p) => p[0] === "t")?.[1];
  const v1 = parts.find((p) => p[0] === "v1")?.[1];
  if (!t || !v1) return false;

  const age = Math.abs(Date.now() / 1000 - Number(t));
  if (!Number.isFinite(age) || age > 600) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${rawBody}`));
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expected.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}
