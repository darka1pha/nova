import "server-only";

import { cookies } from "next/headers";

const ACCESS_TOKEN_COOKIE = "__access_token";
const REFRESH_TOKEN_COOKIE = "__refresh_token";

const isProd = process.env.NODE_ENV === "production";

export async function getAccessToken() {
  const store = await cookies();
  return store.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

export async function getRefreshToken() {
  const store = await cookies();
  return store.get(REFRESH_TOKEN_COOKIE)?.value ?? null;
}

export async function setTokens({
  accessToken,
  refreshToken,
}: {
  accessToken: string;
  refreshToken: string;
}) {
  const store = await cookies();
  const accessTtl = Number(process.env.AUTH_ACCESS_TOKEN_TTL ?? 900);
  const refreshTtl = Number(process.env.AUTH_REFRESH_TOKEN_TTL ?? 2_592_000);

  const shared = {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
  };

  store.set(ACCESS_TOKEN_COOKIE, accessToken, { ...shared, maxAge: accessTtl });
  store.set(REFRESH_TOKEN_COOKIE, refreshToken, { ...shared, maxAge: refreshTtl });
}

export async function clearTokens() {
  const store = await cookies();
  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
}
