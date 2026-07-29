import "server-only";

import { runRequestInterceptors, runResponseInterceptors } from "@/lib/api/interceptors";
import { ApiError, type ApiRequestConfig, type HttpMethod } from "@/lib/api/types";
import { refreshAccessToken } from "@/lib/auth/refresh";
import { getAccessToken } from "@/lib/auth/token-store";

const DEFAULT_TIMEOUT_MS = Number(process.env.API_TIMEOUT_MS ?? 10_000);
const DEFAULT_RETRIES = 2;
const RETRYABLE_STATUS = new Set([502, 503, 504]);

function buildUrl(path: string, params?: ApiRequestConfig["params"]) {
  const base = process.env.API_BASE_URL ?? "";
  const url = new URL(path, base || "http://localhost");
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return base ? url.toString() : `${url.pathname}${url.search}`;
}

async function parseErrorBody(response: Response) {
  try {
    return await response.clone().json();
  } catch {
    return { message: response.statusText };
  }
}

async function request<T>(
  method: HttpMethod,
  path: string,
  config: ApiRequestConfig = {},
): Promise<T> {
  // Interceptors may rewrite the path and/or config before the request is
  // built. Both the resolved path and resolved config must be used below —
  // previously this discarded any interceptor changes and leaked an
  // internal "__resolvedUrl" marker into the fetch() options via spread.
  const { url: resolvedPath, config: resolvedConfig } = await runRequestInterceptors(
    path,
    config,
  );

  const {
    params,
    json,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    skipAuth,
    ...init
  } = resolvedConfig;

  const url = buildUrl(resolvedPath, params);
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (json !== undefined) headers.set("Content-Type", "application/json");

  if (!skipAuth) {
    const token = await getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      let response = await fetch(url, {
        ...init,
        method,
        headers,
        body: json !== undefined ? JSON.stringify(json) : init.body,
        signal: controller.signal,
      });

      response = await runResponseInterceptors(response);

      if (response.status === 401 && !skipAuth) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          headers.set("Authorization", `Bearer ${refreshed}`);
          attempt += 1;
          continue;
        }
      }

      if (!response.ok) {
        if (RETRYABLE_STATUS.has(response.status) && attempt < retries) {
          attempt += 1;
          await backoff(attempt);
          continue;
        }
        const body = await parseErrorBody(response);
        throw new ApiError({
          message: body.message ?? response.statusText,
          status: response.status,
          code: body.code,
          details: body.details,
        });
      }

      if (response.status === 204) return undefined as T;
      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      if (error instanceof ApiError) throw error;
      if (attempt >= retries) break;
      attempt += 1;
      await backoff(attempt);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error
    ? new ApiError({ message: lastError.message, status: 0 })
    : new ApiError({ message: "Unknown network error", status: 0 });
}

function backoff(attempt: number) {
  const delay = Math.min(1000 * 2 ** attempt, 5000);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

export const api = {
  get: <T>(path: string, config?: ApiRequestConfig) => request<T>("GET", path, config),
  post: <T>(path: string, json?: unknown, config?: ApiRequestConfig) =>
    request<T>("POST", path, { ...config, json }),
  put: <T>(path: string, json?: unknown, config?: ApiRequestConfig) =>
    request<T>("PUT", path, { ...config, json }),
  patch: <T>(path: string, json?: unknown, config?: ApiRequestConfig) =>
    request<T>("PATCH", path, { ...config, json }),
  delete: <T>(path: string, config?: ApiRequestConfig) => request<T>("DELETE", path, config),
};
