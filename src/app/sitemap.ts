import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://hairstyle-tryon.com";
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/hairstyle-changer`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/hairstyle-try-on-app`, changeFrequency: "weekly", priority: 0.8 },
  ];
}
