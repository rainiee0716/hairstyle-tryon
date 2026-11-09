import type { MetadataRoute } from "next";

// 明确允许 AI 爬虫（Ahrefs 第9章：SEO=GEO 的基础，不要屏蔽 AI 抓取）
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || "https://hairstyle-tryon.com"}/sitemap.xml`,
  };
}
