# 部署清单：hairstyle-tryon.com 上线（Cloudflare Workers 版）

架构：Next.js 通过 `@opennextjs/cloudflare` 部署到 Cloudflare Workers；用户/额度/积分存在 Cloudflare D1（SQLite）。
免费额度足够起步：Workers 10 万请求/天（10ms CPU/次）、D1 读 500 万行/写 10 万行/天、静态资源免费。
> 若 try-on 接口偶发 CPU 超限（1102 错误）：前端上传已压缩图片；仍超限就升 Workers Paid（$5/月，CPU 上限 30s）。

## 0. 本地开发环境

```bash
npm install
cp .dev.vars.example .dev.vars      # 填入 AUTH_SECRET（openssl rand -hex 32）与各家 key
npm run db:migrate:local            # 建本地 D1 表（.wrangler/state 下的 SQLite）
npm run dev                         # http://localhost:3000（不配 key 时渲染为 mock 模式）
```

## 1. Cloudflare 资源准备（一次性）

```bash
npx wrangler login
npx wrangler d1 create hairstyle-tryon
# 把输出的 database_id 填进 wrangler.jsonc 的 d1_databases[0].database_id
npm run db:migrate:remote           # 对生产 D1 建表
```

## 2. Google 登录（OAuth 客户端）

1. console.cloud.google.com → 新建项目 → OAuth consent screen 选 External（测试阶段无需提交审核）
2. Credentials → Create Credentials → OAuth client ID → Web application
3. Authorized redirect URIs 填两条：
   - `http://localhost:3000/api/auth/google/callback`
   - `https://hairstyle-tryon.com/api/auth/google/callback`
4. 拿到 Client ID / Secret：

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

## 3. Stripe（卡支付，test 模式先跑通）

1. dashboard.stripe.com → Developers → API keys → 复制 `sk_test_...`
2. 本地联调 webhook（需要 stripe CLI）：
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   # 打印的 whsec_... 填进 .dev.vars 的 STRIPE_WEBHOOK_SECRET
   ```
3. 生产 webhook：Developers → Webhooks → Add endpoint → `https://hairstyle-tryon.com/api/webhooks/stripe`
   → 订阅事件 `checkout.session.completed`、`checkout.session.async_payment_succeeded`
   → 把 signing secret 配到 wrangler secret。

```bash
npx wrangler secret put STRIPE_SECRET_KEY        # 上线后换成 sk_live_...
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

价格/档位在 `src/lib/packs.ts` 里改，Stripe 后台**不需要**建商品（Checkout Session 用 price_data 内联报价）。

## 4. PayPal

1. developer.paypal.com → My Apps & Credentials → Sandbox → Create App → 复制 Client ID/Secret
   （上线切 Live 标签再建一个，把 `PAYPAL_ENV` 改成 `live`）
2. 价格同样来自 `src/lib/packs.ts`，PayPal 后台无需配置商品。

```bash
npx wrangler secret put PAYPAL_CLIENT_ID
npx wrangler secret put PAYPAL_CLIENT_SECRET
npx wrangler secret put PAYPAL_ENV      # 值：sandbox（默认）或 live
```

## 5. 渲染 API Key（二选一；务必在供应商控制台设月度消费上限）

- **Gemini**（推荐起步）：aistudio.google.com → Get API key（免费层即可）
  ```bash
  npx wrangler secret put IMAGE_PROVIDER    # 值：gemini
  npx wrangler secret put GEMINI_API_KEY
  ```
- **火山方舟 SeedEdit**：方舟控制台创建 API Key，开通 SeedEdit 模型
  ```bash
  npx wrangler secret put IMAGE_PROVIDER    # 值：ark
  npx wrangler secret put ARK_API_KEY
  npx wrangler secret put ARK_IMAGE_MODEL   # 值：doubao-seededit-3-0-i2i
  ```
- 会话密钥（必配）：`npx wrangler secret put AUTH_SECRET`（openssl rand -hex 32）

没配渲染 key 时站点仍可运行（mock 模式返回原图，流程可演示）。

## 6. 部署

```bash
npm run deploy    # = opennextjs-cloudflare build && opennextjs-cloudflare deploy
```

部署后绑定域名：Workers dashboard → hairstyle-tryon → Settings → Domains & Routes
→ Add Custom Domain → `hairstyle-tryon.com` 和 `www`（按提示在注册商处加 CNAME/记录）。

`NEXT_PUBLIC_SITE_URL` 是构建期内联变量：绑好域名后在项目根建 `.env.production.local`
写 `NEXT_PUBLIC_SITE_URL=https://hairstyle-tryon.com`，重新 `npm run deploy`（影响 metadataBase 与
OAuth 回跳域名；不设则自动取请求 origin，一般也能用）。

## 7. 上线后 30 分钟 SEO 动作

1. search.google.com/search-console → 添加资源（域名 Hairstyle Try On）→ 验证（用 DNS TXT 记录）→ 提交 `https://hairstyle-tryon.com/sitemap.xml`
2. 基础链接第一批：创建品牌的 X / TikTok / Pinterest / Instagram 资料页，简介里带域名
3. 上线第 2 天搜 `site:hairstyle-tryon.com` 确认收录开始

## 8. 验收与迭代（哥飞 Agent 标准）

- 第 6~8 周主词 `hairstyle try on` 进前 20 = 打法对路；进前 10 后看 GSC 实际点击
- 每 1~2 周按观察清单给站加页面（词族每冒新词加一页）
- 免费额度被刷满 = 流量信号出现，此时看 /pricing 的转化（Stripe/PayPal 积分包已就绪）
