"use client";

// In-memory access token for Client Components. The refresh token itself
// never touches the browser's JS runtime - it lives only in an httpOnly
// cookie, set by the server. This module only mirrors the short-lived
// access token so client fetches can attach it.
let accessToken: string | null = null;

export function getClientAccessToken() {
  return accessToken;
}

export function setClientAccessToken(token: string | null) {
  accessToken = token;
}
