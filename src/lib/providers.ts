// 发型渲染供应商适配层：环境变量 IMAGE_PROVIDER 选择 gemini | ark | mock
// 每个供应商实现同一个接口：输入用户照片(base64 dataURL) + 发型描述 → 输出渲染后的 dataURL
// 注意：密钥用 getEnv() 读（本地 dev 时 .dev.vars 只注入 cloudflare binding 上下文，
// 不一定同步进 process.env；生产 Workers 上 OpenNext 会把 env 同步进 process.env）。
import { getEnv } from "./env";

export type ProviderName = "gemini" | "ark" | "mock";

export function getProvider(): ProviderName {
  const p = (getEnv("IMAGE_PROVIDER") || "").toLowerCase();
  if (p === "gemini" || p === "ark" || p === "mock") return p;
  // 自动探测：有哪个 key 就用哪家
  if (getEnv("GEMINI_API_KEY")) return "gemini";
  if (getEnv("ARK_API_KEY")) return "ark";
  return "mock";
}

const STYLE_PROMPTS: Record<string, string> = {
  "textured-crop": "a modern textured crop haircut, short faded sides with messy textured top",
  "side-part": "a classic side part haircut, neatly combed with a defined part line",
  "buzz-cut": "a clean buzz cut, very short all around",
  "slick-back": "a slicked back hairstyle, glossy and combed backwards",
  "curtains": "a curtains hairstyle with center-parted fringe framing the face",
  "man-bun": "a man bun, hair tied back into a neat bun",
  "long-wavy": "long wavy hair flowing past the shoulders, natural soft waves",
  "bob": "a chin-length blunt bob haircut, straight and smooth",
  "curtain-bangs": "long hair with curtain bangs framing the forehead",
  "pixie": "a short pixie cut, textured and feathered",
  "beach-waves": "shoulder-length beach waves, loose and sun-kissed",
  "updo": "an elegant updo, hair swept up and pinned",
};

export function getStylePrompt(styleId: string): string | null {
  return STYLE_PROMPTS[styleId] ?? null;
}

const BASE_RULE =
  "Change ONLY the hairstyle of the person in this photo to the described hairstyle. " +
  "Keep the person's face, identity, skin tone, expression, clothing, pose and background exactly the same. " +
  "Photorealistic result, natural hairline, realistic lighting consistent with the original photo. " +
  "The hairstyle: ";

export async function renderHairstyle(
  imageDataUrl: string,
  styleId: string,
  gender: "male" | "female"
): Promise<{ image: string; provider: string }> {
  const provider = getProvider();
  const style = STYLE_PROMPTS[styleId];
  if (!style) throw new Error("unknown style");

  const prompt = BASE_RULE + style + ` (a hairstyle suited for a ${gender} person).`;

  if (provider === "gemini") {
    const img = await renderGemini(prompt, imageDataUrl);
    return { image: img, provider };
  }
  if (provider === "ark") {
    const img = await renderArk(prompt, imageDataUrl);
    return { image: img, provider };
  }
  // mock：开发/演示模式，直接返回原图（流程可跑通）
  return { image: imageDataUrl, provider: "mock" };
}

async function renderGemini(prompt: string, imageDataUrl: string): Promise<string> {
  const key = getEnv("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY not set");
  const m = imageDataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) throw new Error("bad image data");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: m[1], data: m[2] } },
            ],
          },
        ],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    }
  );
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  const parts = j?.candidates?.[0]?.content?.parts || [];
  for (const p of parts) {
    if (p.inline_data?.data) return `data:${p.inline_data.mime_type};base64,${p.inline_data.data}`;
    if (p.inlineData?.data) return `data:${p.inlineData.mime_type};base64,${p.inlineData.data}`;
  }
  throw new Error("gemini: no image in response");
}

async function renderArk(prompt: string, imageDataUrl: string): Promise<string> {
  const key = getEnv("ARK_API_KEY");
  if (!key) throw new Error("ARK_API_KEY not set");
  const model = getEnv("ARK_IMAGE_MODEL") || "doubao-seededit-3-0-i2i";
  const res = await fetch("https://ark.cn-beijing.volces.com/api/v3/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, prompt, image: imageDataUrl, response_format: "url" }),
  });
  if (!res.ok) throw new Error(`ark ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  const url = j?.data?.[0]?.url;
  if (!url) throw new Error("ark: no image url in response");
  // 拉回图片转 dataURL，避免前端跨域问题
  const imgRes = await fetch(url);
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const type = imgRes.headers.get("content-type") || "image/jpeg";
  return `data:${type};base64,${buf.toString("base64")}`;
}
