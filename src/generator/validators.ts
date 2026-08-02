import { MissingPluginDependencyError, PluginConflictError } from "./errors.js";
import { PLUGIN_METADATA } from "./pluginMetadata.js";
import type { FeatureFlags, FeatureKey } from "../types.js";

/**
 * Validates a feature selection against `PLUGIN_METADATA` before any files
 * are written. With today's plugins this is effectively a no-op (nothing
 * declares a conflict or hard requirement yet), but it gives every future
 * plugin a single place to declare constraints and guarantees they're
 * checked up front rather than discovered mid-generation.
 */
export function validatePluginSelection(features: FeatureFlags): void {
  const enabled = (Object.entries(features) as [FeatureKey, boolean][])
    .filter(([, isEnabled]) => isEnabled)
    .map(([key]) => key);

  const enabledSet = new Set(enabled);

  for (const feature of enabled) {
    const metadata = PLUGIN_METADATA[feature];
    if (!metadata) continue;

    for (const requirement of metadata.requires ?? []) {
      if (!enabledSet.has(requirement)) {
        throw new MissingPluginDependencyError(
          metadata.name,
          PLUGIN_METADATA[requirement]?.name ?? requirement,
        );
      }
    }

    for (const conflict of metadata.conflicts ?? []) {
      if (enabledSet.has(conflict)) {
        throw new PluginConflictError(metadata.name, PLUGIN_METADATA[conflict]?.name ?? conflict);
      }
    }
  }
}