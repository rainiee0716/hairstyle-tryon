import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// 不配置 incremental cache：站点内容基本静态，`use cache` 的跨隔离实例
// 重验证降级为单实例内有效。后续需要 ISR 精确重验证时再接 R2 + KV。
export default defineCloudflareConfig();
