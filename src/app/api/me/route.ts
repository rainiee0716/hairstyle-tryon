import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCreditsBalance } from "@/lib/credits";
import { getSessionUser } from "@/lib/session";

// GET /api/me —— Header / pricing 用的当前用户与积分余额
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ user: null });

  const db = getDb();
  const row = await db
    .prepare("SELECT email, name, avatar_url FROM users WHERE id = ?")
    .bind(user.userId)
    .first<{ email: string; name: string | null; avatar_url: string | null }>();
  if (!row) return NextResponse.json({ user: null });

  const credits = await getCreditsBalance(db, user.userId);
  return NextResponse.json({
    user: { email: row.email, name: row.name, avatarUrl: row.avatar_url },
    credits,
  });
}
