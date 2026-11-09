// POST /api/try-on — 免费额度限流（cookie）+ 调用渲染供应商
// MVP 阶段用 cookie 记录每日用量；上线后可升级 Upstash/Vercel KV 按 IP 精确限流。
// 真正的兜底是 API key 侧的消费上限（务必在供应商控制台设置月度预算）。
import { NextRequest, NextResponse } from "next/server";
import { renderHairstyle } from "@/lib/providers";

const FREE_PER_DAY = 2;

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  // 免费额度检查
  const usageCookie = req.cookies.get("hto_usage")?.value;
  let usage: { date: string; count: number } = { date: "", count: 0 };
  try {
    if (usageCookie) usage = JSON.parse(usageCookie);
  } catch {}

  const today = new Date().toISOString().slice(0, 10);
  if (usage.date === today && usage.count >= FREE_PER_DAY) {
    return NextResponse.json(
      {
        error: "limit",
        message: `You've used your ${FREE_PER_DAY} free try-ons today. Come back tomorrow or upgrade for more.`,
      },
      { status: 429 }
    );
  }

  let body: { image?: string; style?: string; gender?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const image = body.image || "";
  const style = body.style || "";
  const gender = body.gender === "female" ? "female" : "male";

  if (!image.startsWith("data:image/") || image.length > 9_000_000) {
    return NextResponse.json({ error: "invalid image" }, { status: 400 });
  }

  try {
    const result = await renderHairstyle(image, style, gender);
    const newCount = usage.date === today ? usage.count + 1 : 1;
    const res = NextResponse.json({ image: result.image, provider: result.provider });
    res.cookies.set("hto_usage", JSON.stringify({ date: today, count: newCount }), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 2,
    });
    return res;
  } catch (e: any) {
    console.error("render failed:", e?.message);
    return NextResponse.json(
      { error: "render_failed", message: "Rendering failed, please try again." },
      { status: 500 }
    );
  }
}
