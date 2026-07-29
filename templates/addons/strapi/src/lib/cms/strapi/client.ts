/**
 * Strapi CMS API client wrapper.
 *
 * This client wraps the fetch API for communicating with a Strapi backend.
 * It handles authentication via API token and provides utilities for
 * querying content, managing drafts/published states, and fetching media.
 */

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

export interface StrapiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: unknown;
  draft?: boolean;
}

/**
 * Make a request to Strapi API with authentication and defaults.
 */
export async function strapiRequest<T>(
  endpoint: string,
  options: StrapiRequestOptions = {},
): Promise<T> {
  const { method = "GET", headers = {}, body, draft = false } = options;

  const url = new URL(endpoint, STRAPI_URL).toString();

  const fetchOptions: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  // Add authorization header if token is available
  if (STRAPI_API_TOKEN) {
    fetchOptions.headers = {
      ...fetchOptions.headers,
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    };
  }

  // Add draft mode parameter if needed
  if (draft) {
    url += url.includes("?") ? "&" : "?";
    url += "status=draft";
  }

  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    throw new Error(`Strapi API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Query content from Strapi by collection type.
 */
export async function queryContent<T>(
  contentType: string,
  query?: Record<string, unknown>,
): Promise<{ data: T[] }> {
  const params = new URLSearchParams();

  // Add standard query parameters
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
  }

  const endpoint = `/api/${contentType}${params.toString() ? `?${params.toString()}` : ""}`;
  return strapiRequest(endpoint);
}

/**
 * Get a single content item by ID.
 */
export async function getContentById<T>(contentType: string, id: string | number): Promise<{ data: T }> {
  return strapiRequest(`/api/${contentType}/${id}`);
}

/**
 * Get a single content item by slug.
 */
export async function getContentBySlug<T>(
  contentType: string,
  slug: string,
): Promise<{ data: T[] }> {
  return queryContent<T>(contentType, {
    filters: { slug: { $eq: slug } },
    limit: 1,
  });
}

/**
 * Format Strapi media URL.
 * Handles both relative and absolute URLs.
 */
export function getStrapiMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;

  // If already absolute URL, return as-is
  if (path.startsWith("http")) {
    return path;
  }

  // Otherwise, prepend Strapi URL
  return `${STRAPI_URL}${path}`;
}

/**
 * Types for common Strapi attributes.
 */
export interface StrapiMeta {
  pagination?: {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
  };
}

export interface StrapiMediaAttribute {
  id: number;
  name: string;
  alternativeText: string;
  caption: string;
  width: number;
  height: number;
  formats: {
    thumbnail?: {
      url: string;
      width: number;
      height: number;
    };
    small?: {
      url: string;
      width: number;
      height: number;
    };
    medium?: {
      url: string;
      width: number;
      height: number;
    };
    large?: {
      url: string;
      width: number;
      height: number;
    };
  };
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl: string | null;
  provider: string;
  provider_metadata: unknown;
  createdAt: string;
  updatedAt: string;
}
