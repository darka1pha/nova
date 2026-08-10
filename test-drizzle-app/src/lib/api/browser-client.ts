"use client";

import { ApiError, type ApiRequestConfig, type HttpMethod } from "@/lib/api/types";
import { getClientAccessToken, setClientAccessToken } from "@/lib/auth/client-token-store";

const DEFAULT_TIMEOUT_MS = 10_000;

async function request<T>(
  method: HttpMethod,
  path: string,
  config: ApiRequestConfig = {},
): Promise<T> {
  const { params, json, timeoutMs = DEFAULT_TIMEOUT_MS, skipAuth, ...init } = config;

  const url = new URL(path, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (json !== undefined) headers.set("Content-Type", "application/json");

  const token = getClientAccessToken();
  if (!skipAuth && token) headers.set("Authorization", `Bearer ${token}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      ...init,
      method,
      headers,
      credentials: "include",
      body: json !== undefined ? JSON.stringify(json) : init.body,
      signal: controller.signal,
    });

    if (response.status === 401 && !skipAuth) {
      // Client-side refresh: hits our own /api/auth/refresh route, which
      // proxies to the backend using the httpOnly refresh cookie.
      const refreshRes = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      if (refreshRes.ok) {
        const { accessToken } = await refreshRes.json();
        setClientAccessToken(accessToken);
        return request<T>(method, path, config);
      }
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({ message: response.statusText }));
      throw new ApiError({ message: body.message, status: response.status, code: body.code });
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export const browserApi = {
  get: <T>(path: string, config?: ApiRequestConfig) => request<T>("GET", path, config),
  post: <T>(path: string, json?: unknown, config?: ApiRequestConfig) =>
    request<T>("POST", path, { ...config, json }),
  put: <T>(path: string, json?: unknown, config?: ApiRequestConfig) =>
    request<T>("PUT", path, { ...config, json }),
  patch: <T>(path: string, json?: unknown, config?: ApiRequestConfig) =>
    request<T>("PATCH", path, { ...config, json }),
  delete: <T>(path: string, config?: ApiRequestConfig) => request<T>("DELETE", path, config),
};
