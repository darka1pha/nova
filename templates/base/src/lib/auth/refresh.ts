import "server-only";

import { clearTokens, getRefreshToken, setTokens } from "@/lib/auth/token-store";

/**
 * Coalesces concurrent refresh attempts into a single in-flight request so
 * that a burst of parallel 401s doesn't spam the auth server with N
 * simultaneous refresh calls. See docs/authentication.md for the full flow.
 */
let inFlightRefresh: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (inFlightRefresh) return inFlightRefresh;

  inFlightRefresh = doRefresh().finally(() => {
    inFlightRefresh = null;
  });

  return inFlightRefresh;
}

async function doRefresh(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    await clearTokens();
    return null;
  }

  try {
    const response = await fetch(`${process.env.API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });

    if (!response.ok) {
      await clearTokens();
      return null;
    }

    const data = (await response.json()) as { accessToken: string; refreshToken: string };
    await setTokens(data);
    return data.accessToken;
  } catch {
    // Network failure during refresh: treat as logged out rather than retry
    // indefinitely, to avoid masking a genuinely expired session.
    await clearTokens();
    return null;
  }
}
