// D1 访问封装。不引 ORM，控制 worker 体积（免费版 3MiB gzip 上限）。
// D1 类型从 @cloudflare/workers-types 精简而来，够用即可。
import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  meta: { changes: number; last_row_id: number };
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

export function getDb(): D1Database {
  const { env } = getCloudflareContext();
  const db = (env as { DB?: D1Database }).DB;
  if (!db) {
    throw new Error(
      "D1 binding DB not available. Check wrangler.jsonc d1_databases and run `npm run db:migrate:local`."
    );
  }
  return db;
}

/** 今天的 UTC 日期（YYYY-MM-DD），与匿名 cookie 限流的口径一致 */
export function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}
