import { ADDON_FOLDERS } from "../addonRegistry.js";
import { FEATURE_CONTRIBUTIONS } from "../featureContributions.js";
import type { PackageAdditions } from "../packageMerge.js";
import type { FeatureKey } from "../types.js";
import { PLUGIN_METADATA, type PluginMetadata } from "./pluginMetadata.js";

/**
 * A single, assembled view of everything Nova knows about one plugin -
 * its folder on disk, its declared metadata (name/description/
 * requires/conflicts/supportedUI), and its actual package.json footprint.
 *
 * This is read-only, derived data: nothing here is a new source of truth,
 * it's a join across `ADDON_FOLDERS`, `PLUGIN_METADATA`, and
 * `FEATURE_CONTRIBUTIONS` so callers (the `nova plugins` command today,
 * and a future `nova doctor`/`nova upgrade`/`nova remove` tomorrow) have a
 * single place to ask "what does this plugin actually do" without
 * re-deriving it from three separate imports each time.
 */
export interface PluginInfo {
  key: FeatureKey;
  folder: string;
  metadata: PluginMetadata;
  packageFootprint: PackageAdditions;
}

export function getPluginInfo(feature: FeatureKey): PluginInfo {
  return {
    key: feature,
    folder: ADDON_FOLDERS[feature],
    metadata: PLUGIN_METADATA[feature],
    packageFootprint: FEATURE_CONTRIBUTIONS[feature] ?? {},
  };
}

export function listAllPluginInfo(): PluginInfo[] {
  return (Object.keys(ADDON_FOLDERS) as FeatureKey[])
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .map(getPluginInfo);
}

/**
 * Human-readable one-liner summarizing a plugin's package.json footprint,
 * e.g. "2 deps, 1 devDep, 3 scripts" or "no package.json footprint" for
 * plugins that only ship generated files (docker, health, etc).
 */
export function summarizeFootprint(footprint: PackageAdditions): string {
  const depCount = Object.keys(footprint.dependencies ?? {}).length;
  const devDepCount = Object.keys(footprint.devDependencies ?? {}).length;
  const scriptCount = Object.keys(footprint.scripts ?? {}).length;

  const parts: string[] = [];
  if (depCount) parts.push(`${depCount} dep${depCount === 1 ? "" : "s"}`);
  if (devDepCount) parts.push(`${devDepCount} devDep${devDepCount === 1 ? "" : "s"}`);
  if (scriptCount) parts.push(`${scriptCount} script${scriptCount === 1 ? "" : "s"}`);

  return parts.length ? parts.join(", ") : "no package.json footprint";
}