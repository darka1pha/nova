/**
 * Low-level HTTP client for the npm package registry.
 *
 * Fetches abbreviated package metadata (the "Accept: application/vnd.npm.install-v1+json"
 * subset) to keep payloads small. Handles network errors, timeouts,
 * 404s, and malformed responses with actionable error messages.
 *
 * Never logs or exposes registry authentication credentials.
 */

import { URL } from "node:url";

import type { RegistryPackageInfo } from "./types.js";

const DEFAULT_REGISTRY = "https://registry.npmjs.org";
const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * npm package name validation.
 * Scoped: @scope/name (both parts alphanumeric + hyphens/dots/underscores)
 * Unscoped: name (alphanumeric + hyphens/dots/underscores, no leading dots/underscores)
 */
const SCOPED_PKG_RE = /^@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/;
const UNSCOPED_PKG_RE = /^[a-z0-9][a-z0-9._-]*$/;

export function isValidPackageName(name: string): boolean {
  if (!name || name.length > 214) return false;
  return SCOPED_PKG_RE.test(name) || UNSCOPED_PKG_RE.test(name);
}

/**
 * Sanitizes a URL for safe inclusion in error messages by stripping
 * any userinfo (username:password) from the authority component.
 */
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.username = "";
    parsed.password = "";
    return parsed.toString();
  } catch {
    return "<invalid-url>";
  }
}

export class RegistryClientError extends Error {
  constructor(
    message: string,
    public readonly packageName: string,
    public readonly registryUrl: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "RegistryClientError";
  }
}

export class RegistryClient {
  private readonly registryUrl: string;
  private readonly timeoutMs: number;

  constructor(registryUrl?: string, timeoutMs?: number) {
    this.registryUrl = (registryUrl ?? DEFAULT_REGISTRY).replace(/\/$/, "");
    this.timeoutMs = timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Fetches package metadata from the registry.
   * Uses the abbreviated metadata endpoint for smaller payloads.
   */
  async fetchPackageInfo(packageName: string): Promise<RegistryPackageInfo> {
    if (!isValidPackageName(packageName)) {
      throw new RegistryClientError(
        `Invalid package name: "${packageName}". Package names must be lowercase, URL-safe, and follow npm naming conventions.`,
        packageName,
        sanitizeUrl(this.registryUrl),
      );
    }

    // Encode scoped package names: @scope/name → @scope%2fname
    const encodedName = packageName.startsWith("@")
      ? `@${encodeURIComponent(packageName.slice(1))}`
      : encodeURIComponent(packageName);

    const url = `${this.registryUrl}/${encodedName}`;
    const safeUrl = sanitizeUrl(url);

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/vnd.npm.install-v1+json, application/json;q=0.9",
          "User-Agent": "nova-cli",
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (response.status === 401 || response.status === 403) {
        throw new RegistryClientError(
          `Unable to resolve latest version for "${packageName}".\n\nRegistry:\n  ${safeUrl}\n\nReason:\n  Authentication failed (HTTP ${response.status}). Check your registry credentials.\n\nNo files were modified.`,
          packageName,
          safeUrl,
          response.status,
        );
      }

      if (response.status === 404) {
        throw new RegistryClientError(
          `Package "${packageName}" not found on registry.`,
          packageName,
          safeUrl,
          404,
        );
      }

      if (!response.ok) {
        throw new RegistryClientError(
          `Registry returned HTTP ${response.status} for "${packageName}".`,
          packageName,
          safeUrl,
          response.status,
        );
      }

      const data = (await response.json()) as Record<string, unknown>;
      return this.parsePackageInfo(data, packageName, safeUrl);
    } catch (error) {
      if (error instanceof RegistryClientError) throw error;

      const message = error instanceof Error ? error.message : String(error);

      // Provide actionable error messages
      if (message.includes("ENOTFOUND") || message.includes("EAI_AGAIN") || message.includes("fetch failed")) {
        throw new RegistryClientError(
          `Unable to resolve latest version for "${packageName}".\n\nRegistry:\n  ${safeUrl}\n\nReason:\n  Network request failed. Check your internet connection.\n\nNo files were modified.`,
          packageName,
          safeUrl,
        );
      }
      if (message.includes("ETIMEDOUT") || message.includes("TimeoutError") || message.includes("timeout") || message.includes("aborted")) {
        throw new RegistryClientError(
          `Unable to resolve latest version for "${packageName}".\n\nRegistry:\n  ${safeUrl}\n\nReason:\n  Network request timed out.\n\nNo files were modified.`,
          packageName,
          safeUrl,
        );
      }
      if (message.includes("ECONNREFUSED")) {
        throw new RegistryClientError(
          `Unable to resolve latest version for "${packageName}".\n\nRegistry:\n  ${safeUrl}\n\nReason:\n  Connection refused. The registry may be unavailable.\n\nNo files were modified.`,
          packageName,
          safeUrl,
        );
      }

      throw new RegistryClientError(
        `Unable to resolve latest version for "${packageName}".\n\nRegistry:\n  ${safeUrl}\n\nReason:\n  ${message}\n\nNo files were modified.`,
        packageName,
        safeUrl,
      );
    }
  }

  private parsePackageInfo(data: Record<string, unknown>, packageName: string, safeUrl: string): RegistryPackageInfo {
    // Extract versions from the full packument format or abbreviated format
    let versions: string[] = [];
    if (data.versions && typeof data.versions === "object" && !Array.isArray(data.versions)) {
      versions = Object.keys(data.versions as Record<string, unknown>);
    }

    // Extract dist-tags
    const distTags: Record<string, string> = {};
    if (data["dist-tags"] && typeof data["dist-tags"] === "object") {
      for (const [tag, version] of Object.entries(data["dist-tags"] as Record<string, unknown>)) {
        if (typeof version === "string") {
          distTags[tag] = version;
        }
      }
    }

    if (versions.length === 0 && !distTags.latest) {
      throw new RegistryClientError(
        `Unable to resolve latest version for "${packageName}".\n\nRegistry:\n  ${safeUrl}\n\nReason:\n  Package not found or has no published versions.\n\nNo files were modified.`,
        packageName,
        safeUrl,
        404,
      );
    }

    return {
      name: typeof data.name === "string" ? data.name : packageName,
      versions,
      distTags,
    };
  }
}
