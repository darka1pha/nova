import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export async function GET() {
  const checks: Record<string, string> = { status: "ok" };

  // Redis readiness
  if (process.env.REDIS_URL) {
    try {
      const redis = getRedis();
      const pong = await redis.ping();
      checks.redis = pong === "PONG" ? "ok" : String(pong);
    } catch (e) {
      checks.redis = "error";
    }
  } else {
    checks.redis = "skipped";
  }

  // Database: if DATABASE_URL present, we can't safely verify without prisma
  // so report as unknown when present to avoid false positives.
  if (process.env.DATABASE_URL) {
    checks.database = "unknown";
  } else {
    checks.database = "skipped";
  }

  return NextResponse.json(checks);
}
