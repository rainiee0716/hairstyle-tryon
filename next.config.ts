import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // cacheComponents / partialPrefetching 曾开启，但 cacheComponents 的运行时
  // 调度依赖 setTimeout()，在 Cloudflare Workers（workerd）上会挂起页面渲染
  // 请求（partialPrefetching 又依赖它），故一并关闭。本站无 `use cache` 用法，
  // 标准渲染即可；如回 Vercel 可再开启。
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// 让 next dev 通过 miniflare 拿到 wrangler bindings（本地 D1 = .wrangler/state 里的 SQLite）
initOpenNextCloudflareForDev();

export default nextConfig;
