-- 用户与积分体系（Cloudflare D1 / SQLite）
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  google_sub TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 每日免费额度记账（登录用户；匿名用户仍走 cookie）
CREATE TABLE IF NOT EXISTS daily_usage (
  user_id INTEGER NOT NULL,
  usage_date TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date)
);

-- 积分流水：余额 = SUM(delta)。ref_id 用于幂等（同一笔支付只入账一次）
CREATE TABLE IF NOT EXISTS credit_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL, -- purchase | consume | refund
  ref_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_dedup
  ON credit_ledger(user_id, reason, ref_id);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON credit_ledger(user_id);

-- 支付订单（Stripe Checkout Session / PayPal Order 各一条）
CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  provider TEXT NOT NULL, -- stripe | paypal
  provider_order_id TEXT NOT NULL UNIQUE,
  pack_id TEXT NOT NULL,
  credits INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'created', -- created | paid
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
