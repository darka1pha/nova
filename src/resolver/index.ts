/**
 * Centralized package resolver — the single resolution service all Nova
 * lifecycle operations (create, add, upgrade) share.
 *
 * Architecture:
 *   PackageRequirements → Resolver → RegistryClient → semver → ResolvedPackages
 *
 * Features:
 *   - Per-operation in-memory cache (no persistent cache)
 *   - Deduplicates concurrent requests for the same package
 *   - Excludes prerelease versions by default
 *   - Falls back to static versions on network failure (with warning)
 *   - Batch resolution for efficiency
 */

import semver from "semver";

import { RegistryClient, RegistryClientError } from "./registryClient.js";
import type {
  PackageRequirement,
  PackageResolutionError,
  PackageResolutionResult,
  PackageResolverOptions,
  RegistryPackageInfo,
  ResolvedPackage,
} from "./types.js";

export { RegistryClientError } from "./registryClient.js";
export type {
  PackageRequirement,
  PackageResolutionError,
  PackageResolutionResult,
  PackageResolverOptions,
  RegistryPackageInfo,
  ResolvedPackage,
  PackageResolutionStrategy,
} from "./types.js";

export class PackageResolver {
  private static readonly globalCache = new Map<string, RegistryPackageInfo>();
  private static readonly globalPending = new Map<string, Promise<RegistryPackageInfo>>();
  private readonly client: RegistryClient;
  private readonly cache = new Map<string, RegistryPackageInfo>();
  private readonly offline: boolean;
  /** Warnings collected during resolution (e.g. fallbacks used). */
  public readonly warnings: string[] = [];

  constructor(options: PackageResolverOptions = {}) {
    this.client = new RegistryClient(options.registryUrl, options.timeoutMs);
    this.offline = options.offline ?? process.env.NOVA_OFFLINE === "true";
  }

  /**
   * Resolves a batch of package requirements. Deduplicates registry calls
   * and caches results within this resolver instance.
   */
  async resolvePackages(requirements: PackageRequirement[]): Promise<PackageResolutionResult> {
    const resolved: ResolvedPackage[] = [];
    const failed: PackageResolutionError[] = [];

    // Prefetch all unique package names concurrently
    if (!this.offline) {
      const uniqueNames = [...new Set(requirements.map((r) => r.name))];
      await Promise.allSettled(uniqueNames.map((name) => this.fetchPackageInfo(name)));
    }

    // Resolve each requirement
    for (const req of requirements) {
      try {
        const result = await this.resolveSingle(req);
        resolved.push(result);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        failed.push({
          name: req.name,
          reason,
          registry: error instanceof RegistryClientError ? error.registryUrl : undefined,
        });
      }
    }

    return { resolved, failed };
  }

  /**
   * Resolves the latest stable version of a package.
   */
  async resolveLatest(name: string): Promise<ResolvedPackage> {
    return this.resolveSingle({ name, strategy: "latest" });
  }

  /**
   * Resolves the newest version satisfying a semver range.
   */
  async resolveCompatible(name: string, range: string): Promise<ResolvedPackage> {
    return this.resolveSingle({ name, strategy: "compatible", range });
  }

  /**
   * Validates that an exact version exists on the registry.
   */
  async resolveExact(name: string, version: string): Promise<ResolvedPackage> {
    return this.resolveSingle({ name, strategy: "exact", version });
  }

  private async resolveSingle(req: PackageRequirement): Promise<ResolvedPackage> {
    if (this.offline) {
      return this.offlineFallback(req);
    }

    const info = await this.fetchPackageInfo(req.name);
    // Filter to stable versions only (no prereleases)
    const stableVersions = info.versions.filter((v) => !semver.prerelease(v));

    switch (req.strategy) {
      case "latest": {
        // Use dist-tags.latest if available, otherwise pick the highest stable version
        const latest = info.distTags.latest;
        if (latest && semver.valid(latest) && !semver.prerelease(latest)) {
          return {
            name: req.name,
            version: latest,
            versionRange: `^${latest}`,
            strategy: "latest",
            dev: req.dev,
          };
        }

        const highest = stableVersions.length > 0
          ? stableVersions.sort(semver.rcompare)[0]
          : undefined;

        if (!highest) {
          throw new Error(
            `No stable versions found for "${req.name}".`,
          );
        }

        return {
          name: req.name,
          version: highest,
          versionRange: `^${highest}`,
          strategy: "latest",
          dev: req.dev,
        };
      }

      case "compatible": {
        const range = req.range;
        if (!range) {
          throw new Error(
            `Resolution strategy "compatible" requires a semver range for "${req.name}".`,
          );
        }
        if (!semver.validRange(range)) {
          throw new Error(
            `Invalid semver range "${range}" for package "${req.name}".`,
          );
        }

        const match = semver.maxSatisfying(stableVersions, range);
        if (!match) {
          // If no stable version satisfies the range, try including all versions
          const matchAll = semver.maxSatisfying(info.versions, range);
          if (matchAll) {
            this.warnings.push(
              `Package "${req.name}": no stable version satisfies "${range}", using prerelease ${matchAll}.`,
            );
            return {
              name: req.name,
              version: matchAll,
              versionRange: range,
              strategy: "compatible",
              requestedRange: range,
              dev: req.dev,
            };
          }

          throw new Error(
            `No version of "${req.name}" satisfies range "${range}". Available stable versions: ${stableVersions.slice(-5).join(", ") || "(none)"}.`,
          );
        }

        // Determine the range to write: preserve the original range prefix style
        // (^, ~, >=, etc.) but update the version number.
        const versionRange = this.buildVersionRange(range, match);

        return {
          name: req.name,
          version: match,
          versionRange,
          strategy: "compatible",
          requestedRange: range,
          dev: req.dev,
        };
      }

      case "exact": {
        const version = req.version;
        if (!version) {
          throw new Error(
            `Resolution strategy "exact" requires a version for "${req.name}".`,
          );
        }
        if (!semver.valid(version)) {
          throw new Error(
            `Invalid semver version "${version}" for package "${req.name}".`,
          );
        }
        if (!info.versions.includes(version)) {
          throw new Error(
            `Version "${version}" of "${req.name}" not found on registry. Available: ${info.versions.slice(-5).join(", ")}.`,
          );
        }

        return {
          name: req.name,
          version,
          versionRange: version,
          strategy: "exact",
          dev: req.dev,
        };
      }

      default:
        throw new Error(`Unknown resolution strategy: ${(req as PackageRequirement).strategy}`);
    }
  }

  /**
   * Fetches package info with caching and request deduplication.
   */
  private async fetchPackageInfo(name: string): Promise<RegistryPackageInfo> {
    // Return from cache if available
    const cached = this.cache.get(name) || PackageResolver.globalCache.get(name);
    if (cached) {
      this.cache.set(name, cached);
      return cached;
    }

    // Deduplicate in-flight requests
    const pending = PackageResolver.globalPending.get(name);
    if (pending) return pending;

    const promise = this.client.fetchPackageInfo(name).then((info) => {
      this.cache.set(name, info);
      PackageResolver.globalCache.set(name, info);
      PackageResolver.globalPending.delete(name);
      return info;
    }).catch((error) => {
      PackageResolver.globalPending.delete(name);
      throw error;
    });

    PackageResolver.globalPending.set(name, promise);
    return promise;
  }

  /**
   * Returns a sensible version range string that preserves the prefix style
   * of the original range while pinning to the resolved version. For example:
   *   "^15.1.0" + resolved "16.3.1" → "^16.3.1"
   *   "~3.4.0" + resolved "3.4.8" → "~3.4.8"
   */
  private buildVersionRange(originalRange: string, resolvedVersion: string): string {
    if (originalRange.startsWith("~")) {
      return `~${resolvedVersion}`;
    }
    if (originalRange.startsWith(">=")) {
      return `>=${resolvedVersion}`;
    }
    return `^${resolvedVersion}`;
  }

  /**
   * Offline fallback — constructs a ResolvedPackage from the static
   * requirement data without contacting the registry.
   */
  private offlineFallback(req: PackageRequirement): ResolvedPackage {
    switch (req.strategy) {
      case "compatible": {
        const range = req.range ?? "*";
        const coerced = semver.minVersion(range);
        return {
          name: req.name,
          version: coerced?.version ?? "0.0.0",
          versionRange: range,
          strategy: "compatible",
          requestedRange: range,
          dev: req.dev,
        };
      }
      case "exact": {
        const version = req.version ?? "0.0.0";
        return {
          name: req.name,
          version,
          versionRange: version,
          strategy: "exact",
          dev: req.dev,
        };
      }
      case "latest":
      default: {
        return {
          name: req.name,
          version: "0.0.0",
          versionRange: "*",
          strategy: "latest",
          dev: req.dev,
        };
      }
    }
  }
}
