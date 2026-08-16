/**
 * Package resolution types for Nova's centralized dependency resolver.
 *
 * These types model the three resolution strategies Nova supports and the
 * data flowing through the resolve → install pipeline. They integrate with
 * the existing `PackageAdditions` (packageMerge.ts) and `PluginManifest`
 * (plugin/types.ts) types without replacing them — `FEATURE_CONTRIBUTIONS`
 * remains the single source of truth for what each feature contributes.
 */

export type PackageResolutionStrategy = "latest" | "compatible" | "exact";

/**
 * Declarative requirement for a single npm package. Built from the ranges
 * already declared in `FEATURE_CONTRIBUTIONS` or `buildPackageJson`.
 *
 * - "compatible" (default) — resolve the newest published version that
 *   satisfies `range` (e.g. "^15.1.0" → newest 15.x.y).
 * - "latest" — resolve the newest stable published version, ignoring any
 *   compatibility range.
 * - "exact" — validate that exactly `version` exists on the registry.
 */
export interface PackageRequirement {
  name: string;
  strategy: PackageResolutionStrategy;
  /** Semver range for "compatible" strategy (e.g. "^15.1.0"). */
  range?: string;
  /** Exact version for "exact" strategy (e.g. "1.2.3"). */
  version?: string;
  /** Whether this is a devDependency. */
  dev?: boolean;
}

/**
 * A single package whose version has been resolved against the registry.
 */
export interface ResolvedPackage {
  name: string;
  /** The concrete resolved version (e.g. "15.3.2"). */
  version: string;
  /** The range to write to package.json (e.g. "^15.3.2"). */
  versionRange: string;
  /** Which strategy was used. */
  strategy: PackageResolutionStrategy;
  /** The original range if "compatible" was used. */
  requestedRange?: string;
  /** Whether this is a devDependency. */
  dev?: boolean;
}

/**
 * Batch result from `resolvePackages()`. Contains both successful
 * resolutions and failures.
 */
export interface PackageResolutionResult {
  resolved: ResolvedPackage[];
  failed: PackageResolutionError[];
}

export interface PackageResolutionError {
  name: string;
  reason: string;
  /** Registry URL that was queried, if any. */
  registry?: string;
}

/**
 * Metadata fetched from the npm registry for a single package.
 * Only the fields Nova needs — we deliberately avoid fetching
 * the full packument (which can be megabytes for popular packages).
 */
export interface RegistryPackageInfo {
  name: string;
  /** All published versions (keys are version strings). */
  versions: string[];
  /** dist-tags, usually includes "latest". */
  distTags: Record<string, string>;
}

/** Options for the PackageResolver constructor. */
export interface PackageResolverOptions {
  /** Override the npm registry URL (default: read from npm config or https://registry.npmjs.org). */
  registryUrl?: string;
  /** Request timeout in milliseconds (default: 15000). */
  timeoutMs?: number;
  /** When true, skip actual registry calls and return static fallback versions. */
  offline?: boolean;
}
