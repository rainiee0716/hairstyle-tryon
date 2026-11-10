// 额度与积分：
// - 登录用户每天 FREE_PER_DAY 次免费，之后每次渲染扣 1 积分，无积分则拒绝。
// - 匿名用户维持原有 cookie 限流（见 /api/try-on）。
// - 记账在渲染前扣减（防止并行请求绕过），渲染失败时退款。
import type { D1Database } from "./db";
import { utcToday } from "./db";

export const FREE_PER_DAY = 2;

export type Reservation = "free" | "credit";

export type ReserveOk = { ok: true; kind: Reservation; creditsLeft: number };
export type ReserveDeny = { ok: false; credits: number; freeUsed: number };

export async function getCreditsBalance(db: D1Database, userId: number): Promise<number> {
  const row = await db
    .prepare("SELECT COALESCE(SUM(delta), 0) AS balance FROM credit_ledger WHERE user_id = ?")
    .bind(userId)
    .first<{ balance: number }>();
  return row?.balance ?? 0;
}

/** 扣减额度（免费次数或积分），渲染成功后再调用；失败时 refundQuota 退回 */
export async function reserveQuota(
  db: D1Database,
  userId: number
): Promise<ReserveOk | ReserveDeny> {
  const today = utcToday();
  const usage = await db
    .prepare("SELECT count FROM daily_usage WHERE user_id = ? AND usage_date = ?")
    .bind(userId, today)
    .first<{ count: number }>();
  const used = usage?.count ?? 0;

  if (used < FREE_PER_DAY) {
    await db
      .prepare(
        `INSERT INTO daily_usage (user_id, usage_date, count) VALUES (?, ?, 1)
         ON CONFLICT(user_id, usage_date) DO UPDATE SET count = count + 1`
      )
      .bind(userId, today)
      .run();
    const credits = await getCreditsBalance(db, userId);
    return { ok: true, kind: "free", creditsLeft: credits };
  }

  const credits = await getCreditsBalance(db, userId);
  if (credits <= 0) {
    return { ok: false, credits, freeUsed: used };
  }

  await db
    .prepare("INSERT INTO credit_ledger (user_id, delta, reason) VALUES (?, -1, 'consume')")
    .bind(userId)
    .run();
  return { ok: true, kind: "credit", creditsLeft: credits - 1 };
}

export async function refundQuota(
  db: D1Database,
  userId: number,
  kind: Reservation
): Promise<void> {
  if (kind === "free") {
    const today = utcToday();
    await db
      .prepare(
        `UPDATE daily_usage SET count = MAX(count - 1, 0)
         WHERE user_id = ? AND usage_date = ?`
      )
      .bind(userId, today)
      .run();
    return;
  }
  await db
    .prepare("INSERT INTO credit_ledger (user_id, delta, reason) VALUES (?, 1, 'refund')")
    .bind(userId)
    .run();
}

/**
 * 支付入账（幂等）：同一 provider_order_id 只会加一次积分。
 * 以 credit_ledger 的唯一索引 (user_id, reason, ref_id) 为准：changes()=1 表示本次真正入账。
 * 返回入账后的余额。
 */
export async function markPurchasePaid(
  db: D1Database,
  params: {
    userId: number;
    provider: "stripe" | "paypal";
    providerOrderId: string;
    packId: string;
    credits: number;
    amountCents: number;
  }
): Promise<{ credited: boolean; balance: number }> {
  const { userId, provider, providerOrderId, packId, credits, amountCents } = params;

  const existing = await db
    .prepare("SELECT id, status FROM purchases WHERE provider_order_id = ?")
    .bind(providerOrderId)
    .first<{ id: number; status: string }>();

  const ledger = await db
    .prepare(
      `INSERT INTO credit_ledger (user_id, delta, reason, ref_id)
       VALUES (?, ?, 'purchase', ?)
       ON CONFLICT DO NOTHING`
    )
    .bind(userId, credits, providerOrderId)
    .run();
  const credited = ledger.meta.changes === 1;

  if (existing) {
    if (credited) {
      await db
        .prepare(
          `UPDATE purchases SET status = 'paid',
             credits = ?, amount_cents = ?, pack_id = ?,
             paid_at = COALESCE(paid_at, datetime('now'))
           WHERE id = ?`
        )
        .bind(credits, amountCents, packId, existing.id)
        .run();
    }
  } else {
    await db
      .prepare(
        `INSERT INTO purchases
           (user_id, provider, provider_order_id, pack_id, credits, amount_cents, status, paid_at)
         VALUES (?, ?, ?, ?, ?, ?, 'paid', datetime('now'))`
      )
      .bind(userId, provider, providerOrderId, packId, credits, amountCents)
      .run();
  }

  const balance = await getCreditsBalance(db, userId);
  return { credited, balance };
}
