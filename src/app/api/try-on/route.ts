// POST /api/try-on — 额度限流 + 调用渲染供应商
// 登录用户：D1 记账（每天 2 次免费 + 积分扣减），清除 cookie 无法绕过。
// 匿名用户：维持 MVP 的 cookie 每日限流（反刷兜底是供应商 API key 的月度预算）。
import { NextRequest, NextResponse } from "next/server";
import { renderHairstyle } from "@/lib/providers";
import { getDb, utcToday } from "@/lib/db";
import { reserveQuota, refundQuota, FREE_PER_DAY } from "@/lib/credits";
import { getSessionUser } from "@/lib/session";

export const maxDuration = 120;

type AnonUsage = { date: string; count: number };

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  const today = utcToday();

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

  // —— 额度检查/预扣减（渲染成功才落定；失败会退款）——
  let db: ReturnType<typeof getDb> | null = null;
  let reservation: "free" | "credit" | null = null;
  let anonUsage: AnonUsage | null = null;

  if (user) {
    try {
      db = getDb();
    } catch (e) {
      console.error("db not available:", e);
      return NextResponse.json(
        { error: "quota_unavailable", message: "Usage tracking unavailable, please try again later." },
        { status: 503 }
      );
    }
    const outcome = await reserveQuota(db, user.userId);
    if (!outcome.ok) {
      return NextResponse.json(
        {
          error: "limit",
          reason: "no_credits",
          message: `You've used your ${FREE_PER_DAY} free try-ons today and have no credits left.`,
          redirectTo: "/pricing",
        },
        { status: 429 }
      );
    }
    reservation = outcome.kind;
  } else {
    // 匿名 cookie 限流（清 cookie 可绕过；MVP 阶段靠供应商 key 月度预算兜底）
    const usageCookie = req.cookies.get("hto_usage")?.value;
    let usage: AnonUsage = { date: "", count: 0 };
    try {
      if (usageCookie) usage = JSON.parse(usageCookie);
    } catch {}
    if (usage.date === today && usage.count >= FREE_PER_DAY) {
      return NextResponse.json(
        {
          error: "limit",
          message: `You've used your ${FREE_PER_DAY} free try-ons today. Sign in to get more with credit packs.`,
          redirectTo: "/pricing",
        },
        { status: 429 }
      );
    }
    anonUsage = usage;
  }

  try {
    const result = await renderHairstyle(image, style, gender);
    const res = NextResponse.json({ image: result.image, provider: result.provider });
    if (!user && anonUsage) {
      const newCount = anonUsage.date === today ? anonUsage.count + 1 : 1;
      res.cookies.set("hto_usage", JSON.stringify({ date: today, count: newCount }), {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 2,
      });
    }
    return res;
  } catch (e: unknown) {
    // 渲染失败，退回预扣的额度
    if (user && db && reservation) await refundQuota(db, user.userId, reservation);
    const message = e instanceof Error ? e.message : String(e);
    console.error("render failed:", message);
    return NextResponse.json(
      { error: "render_failed", message: "Rendering failed, please try again." },
      { status: 500 }
    );
  }
}
