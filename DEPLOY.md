# 部署清单：hairstyle-tryon.com 上线

## 1. 渲染 API Key（二选一，填入 Vercel 环境变量）

- **Gemini**（推荐起步）：aistudio.google.com → Get API key（免费层即可）。变量：
  ```
  IMAGE_PROVIDER=gemini
  GEMINI_API_KEY=xxx
  ```
- **火山方舟 SeedEdit**（已有方舟账号）：方舟控制台创建 API Key，开通 SeedEdit 模型。变量：
  ```
  IMAGE_PROVIDER=ark
  ARK_API_KEY=xxx
  ARK_IMAGE_MODEL=doubao-seededit-3-0-i2i
  ```
- **务必**在供应商控制台给 key 设月度消费上限（MVP 的防超支兜底）。
- 没配 key 时站点仍可运行（mock 模式返回原图，流程可演示）。

## 2. Vercel 部署（10 分钟）

```bash
npm i -g vercel
vercel login                 # 浏览器登录你的账号
cd ~/Project/sea/hairstyle-tryon
vercel --prod                # 首次部署，按提示确认项目名 hairstyle-tryon
```

部署后在 Vercel 项目 Settings → Environment Variables 里添加上面的 key（Production 环境），再 `vercel --prod` 重部署一次生效。

## 3. 绑定域名

Vercel 项目 → Settings → Domains → 添加 `hairstyle-tryon.com` 和 `www.hairstyle-tryon.com`，按提示在域名注册商处设置：
- A 记录 `@` → `76.76.21.21`
- CNAME `www` → `cname.vercel-dns.com`

（或按 Vercel 页面给的最新值。）设置 `NEXT_PUBLIC_SITE_URL=https://hairstyle-tryon.com` 环境变量。

## 4. 上线后 30 分钟 SEO 动作

1. search.google.com/search-console → 添加资源（域名 Hairstyle Try On）→ 验证（用 DNS TXT 记录）→ 提交 `https://hairstyle-tryon.com/sitemap.xml`
2. 基础链接第一批：创建品牌的 X / TikTok / Pinterest / Instagram 资料页，简介里带域名
3. 上线第 2 天搜 `site:hairstyle-tryon.com` 确认收录开始

## 5. 验收与迭代（哥飞 Agent 标准）

- 第 6~8 周主词 `hairstyle try on` 进前 20 = 打法对路；进前 10 后看 GSC 实际点击
- 每 1~2 周按观察清单给站加页面（词族每冒新词加一页）
- 免费额度被刷满 = 流量信号出现，此时接 Creem 积分包收款（SOP 阶段 5）
