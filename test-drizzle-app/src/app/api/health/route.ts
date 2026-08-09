import { NextResponse } from "next/server";

// Simple liveness endpoint. Extend with DB/cache checks as needed.
export async function GET() {
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}
