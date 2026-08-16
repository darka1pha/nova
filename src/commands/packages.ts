/**
 * `nova packages` — inspect Nova-managed package versions.
 *
 * Lists all packages contributed by installed plugins with their
 * current installed version vs. the latest compatible version from
 * the registry.
 */

import semver from "semver";

import { getPluginRegistry } from "../plugin/legacyAdapter.js";
import { readProjectConfig, readProjectPackage } from "../project.js";
import { PackageResolver } from "../resolver/index.js";
import { collectFeatureRequirements, collectBaseRequirements } from "../resolver/packageRequirements.js";
import type { FeatureKey, UiLibrary } from "../types.js";

export type PackageStatus = "up-to-date" | "update-available" | "incompatible" | "unknown" | "not-found";

export interface PackageInfo {
  name: string;
  installed?: string;
  latest?: string;
  range?: string;
  status: PackageStatus;
  plugin?: string;
}

export interface PackagesResult {
  packages: PackageInfo[];
  errors: string[];
}

/**
 * Inspects all Nova-managed packages in a project.
 */
export async function inspectPackages(
  targetDir: string,
  options: { outdatedOnly?: boolean } = {},
): Promise<PackagesResult> {
  const config = await readProjectConfig(targetDir);
  const pkg = await readProjectPackage(targetDir);
  const registry = getPluginRegistry();

  const installedDeps: Record<string, string> = {
    ...((pkg.dependencies as Record<string, string> | undefined) ?? {}),
    ...((pkg.devDependencies as Record<string, string> | undefined) ?? {}),
  };

  const plugins = config?.plugins ?? [];
  const uiLibrary = (config?.uiLibrary ?? "shadcn") as UiLibrary;

  // Collect all Nova-managed package requirements
  const baseReqs = collectBaseRequirements(uiLibrary);
  const featureReqs = collectFeatureRequirements(plugins as FeatureKey[]);
  const allReqs = [...baseReqs, ...featureReqs];

  // Build a map of package → plugin for attribution
  const packagePluginMap = new Map<string, string>();
  for (const plugin of plugins) {
    const manifest = registry.getPlugin(plugin);
    for (const dep of Object.keys(manifest?.dependencies ?? {})) {
      packagePluginMap.set(dep, plugin);
    }
    for (const dep of Object.keys(manifest?.devDependencies ?? {})) {
      packagePluginMap.set(dep, plugin);
    }
  }

  // Resolve latest versions
  const resolver = new PackageResolver();
  const errors: string[] = [];
  let resolvedMap = new Map<string, { version: string; range: string }>();

  try {
    const result = await resolver.resolvePackages(allReqs);
    for (const r of result.resolved) {
      resolvedMap.set(r.name, { version: r.version, range: r.versionRange });
    }
    for (const f of result.failed) {
      errors.push(`Could not resolve "${f.name}": ${f.reason}`);
    }
  } catch (error) {
    errors.push(`Package resolution failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Deduplicate requirements by name
  const seen = new Set<string>();
  const packages: PackageInfo[] = [];

  for (const req of allReqs) {
    if (seen.has(req.name)) continue;
    seen.add(req.name);

    const installed = installedDeps[req.name];
    const resolved = resolvedMap.get(req.name);
    const latest = resolved?.version;

    let status: PackageStatus = "unknown";

    if (!installed) {
      status = "not-found";
    } else if (!latest) {
      status = "unknown";
    } else {
      // Parse installed version (strip range prefixes like ^, ~)
      const installedClean = semver.minVersion(installed)?.version;
      if (installedClean && latest) {
        if (installedClean === latest) {
          status = "up-to-date";
        } else if (semver.major(installedClean) !== semver.major(latest)) {
          status = "incompatible";
        } else {
          status = semver.lt(installedClean, latest) ? "update-available" : "up-to-date";
        }
      }
    }

    packages.push({
      name: req.name,
      installed: installed ?? undefined,
      latest: latest ?? undefined,
      range: req.range,
      status,
      plugin: packagePluginMap.get(req.name),
    });
  }

  // Filter to outdated only if requested
  const filtered = options.outdatedOnly
    ? packages.filter((p) => p.status === "update-available" || p.status === "incompatible")
    : packages;

  return { packages: filtered, errors };
}
