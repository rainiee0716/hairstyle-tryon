// 统一的环境变量读取：本地 dev 由 initOpenNextCloudflareForDev 注入 process.env，
// 生产 Workers 上 OpenNext 会把 worker env 同步进 process.env；再兜底查一次 binding。
import { getCloudflareContext } from "@opennextjs/cloudflare";

export function getEnv(name: string): string | undefined {
  const v = process.env[name];
  if (v) return v;
  try {
    const env = getCloudflareContext().env as Record<string, string | undefined>;
    return env?.[name];
  } catch {
    return undefined;
  }
}

export function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

export function siteOrigin(reqOrigin: string): string {
  return getEnv("NEXT_PUBLIC_SITE_URL") || reqOrigin;
}
