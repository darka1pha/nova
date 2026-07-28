import { NextResponse } from "next/server";

import { refreshAccessToken } from "@/lib/auth/refresh";

// Bridges the browser (which cannot read httpOnly cookies) to the
// server-side refresh flow. Client components call this instead of talking
// to the backend auth server directly.
export async function POST() {
  const accessToken = await refreshAccessToken();

  if (!accessToken) {
    return NextResponse.json({ message: "Session expired" }, { status: 401 });
  }

  return NextResponse.json({ accessToken });
}
