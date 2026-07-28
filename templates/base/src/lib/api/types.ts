export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequestConfig extends Omit<RequestInit, "method" | "body"> {
  /** Query params, serialized onto the URL. */
  params?: Record<string, string | number | boolean | undefined>;
  /** JSON-serializable body. Serialized automatically; takes precedence over `body`. */
  json?: unknown;
  /** Raw body for non-JSON payloads (FormData, Blob, etc). Ignored if `json` is set. */
  body?: BodyInit | null;
  /** Milliseconds before the request is aborted. Defaults to API_CONFIG.timeoutMs. */
  timeoutMs?: number;
  /** Number of retry attempts for retryable failures (network errors, 502/503/504). */
  retries?: number;
  /** Next.js fetch cache option. */
  cache?: RequestCache;
  /** Next.js revalidation controls. */
  next?: { revalidate?: number | false; tags?: string[] };
  /** Skip attaching the Authorization header (e.g. for public endpoints). */
  skipAuth?: boolean;
}

export interface ApiErrorShape {
  message: string;
  status: number;
  code?: string;
  details?: unknown;
}

export class ApiError extends Error implements ApiErrorShape {
  status: number;
  code?: string;
  details?: unknown;

  constructor({ message, status, code, details }: ApiErrorShape) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
