import { ADDON_FOLDERS } from "../addonRegistry.js";
import { FEATURE_CONTRIBUTIONS } from "../featureContributions.js";
import { PLUGIN_METADATA } from "../generator/pluginMetadata.js";
import type { FeatureKey } from "../types.js";
import { NATIVE_PLUGINS } from "./nativePlugins/index.js";
import { PluginRegistry } from "./registry.js";
import type { PluginCategory, PluginManifest } from "./types.js";

/**
 * Best-effort category assignment for legacy (Phase 1) plugins, used only
 * for `getPluginsByCategory()` / future `nova plugins` grouping. Nothing
 * about generation behavior depends on this - it's presentation-only, so a
 * miscategorized entry here is cosmetic, never a correctness bug.
 */
const LEGACY_CATEGORY: Partial<Record<FeatureKey, PluginCategory>> = {
  prisma: "database",
  redis: "database",
  betterAuth: "authentication",
  zustand: "state",
  tanstackQuery: "state",
  tanstackTable: "ui",
  strapi: "cms",
  recharts: "ui",
  animations: "ui",
  tiptap: "ui",
  designSystem: "ui",
  sentry: "monitoring",
  health: "infrastructure",
  securityHeaders: "infrastructure",
  docker: "infrastructure",
  dockerCompose: "infrastructure",
  husky: "developer-experience",
  bundleAnalyzer: "developer-experience",
  pwa: "infrastructure",
  cypress: "testing",
  playwright: "testing",
  vitest: "testing",
  storybook: "documentation",
  msw: "testing",
  reactEmail: "email",
  mailpit: "email",
  openapi: "developer-experience",
};

/**
 * Wraps a single Phase 1 addon (declared across `addonRegistry.ts`,
 * `generator/pluginMetadata.ts`, and `featureContributions.ts`) as a
 * `PluginManifest`, without modifying any of those files or the existing
 * generation pipeline.
 *
 * This is the Phase 1 -> Phase 2 compatibility bridge: new tooling (the
 * registry, the dependency graph resolver, and eventually a rewritten
 * `nova add`/`nova plugins`) can operate uniformly over `PluginManifest`s
 * today, while `src/generator/index.ts` keeps reading `FeatureFlags` and
 * `ADDON_FOLDERS` exactly as it did before - nothing here changes what
 * gets written to disk for an existing feature.
 *
 * Fields Phase 1 addons don't have a structured source for yet
 * (`templates`, `prompts`, `patches`, `env`, `docs`, `hooks`) are simply
 * left undefined. `resolveDependencyGraph()` and the registry only need
 * `requires`/`conflicts`/`supportedUI`, all of which already exist in
 * `PLUGIN_METADATA`. As each addon migrates to a native manifest (see
 * `nativePlugins/`), `getPluginRegistry()` prefers the native version and
 * this function is no longer called for that id.
 */
export function toPluginManifest(feature: FeatureKey): PluginManifest {
  const metadata = PLUGIN_METADATA[feature];
  const contribution = FEATURE_CONTRIBUTIONS[feature] ?? {};

  return {
    id: feature,
    name: metadata.name,
    version: "1.0.0",
    description: metadata.description,
    category: LEGACY_CATEGORY[feature] ?? "infrastructure",
    tags: [ADDON_FOLDERS[feature]],
    capabilities: metadata.capabilities,
    owns: metadata.owns,
    dependencies: contribution.dependencies,
    devDependencies: contribution.devDependencies,
    scripts: contribution.scripts,
    requires: metadata.requires,
    conflicts: metadata.conflicts,
    conflictReasons: metadata.conflictReasons as Record<string, string> | undefined,
    supportedUI: metadata.supportedUI,
  };
}

let cachedLegacyRegistry: PluginRegistry | undefined;

/**
 * Returns a process-wide `PluginRegistry` pre-populated with every legacy
 * (Phase 1) plugin, adapted via `toPluginManifest()`. Cached because the
 * underlying source maps (`FEATURE_CONTRIBUTIONS`, `PLUGIN_METADATA`,
 * `ADDON_FOLDERS`) are static module-level data with nothing to
 * recompute between calls.
 *
 * Most callers should prefer `getPluginRegistry()` below, which layers
 * native manifests on top of this; this function is exported separately
 * for callers that specifically want the pre-Phase-2.2 legacy-only view
 * (e.g. tests asserting the adapter itself behaves correctly).
 */
export function getLegacyPluginRegistry(): PluginRegistry {
  if (cachedLegacyRegistry) return cachedLegacyRegistry;

  const registry = new PluginRegistry();
  const features = Object.keys(ADDON_FOLDERS) as FeatureKey[];
  registry.registerAll(features.map(toPluginManifest));

  cachedLegacyRegistry = registry;
  return registry;
}

let cachedRegistry: PluginRegistry | undefined;

/**
 * Returns a process-wide `PluginRegistry` containing every plugin Nova
 * knows about: native `PluginManifest`s (see `nativePlugins/`) take
 * precedence, and every remaining `FeatureKey` not covered by a native
 * manifest falls back to the legacy adapter. This is the registry the
 * rest of Phase 2 (prompt execution, the dependency graph, and eventually
 * `nova add`/`nova plugins`) should use, so a plugin migrating off the
 * legacy adapter is a one-line change (add it to `NATIVE_PLUGINS`) rather
 * than a change to every consumer.
 */
export function getPluginRegistry(): PluginRegistry {
  if (cachedRegistry) return cachedRegistry;

  const registry = new PluginRegistry();
  const nativeIds = new Set(NATIVE_PLUGINS.map((plugin) => plugin.id));

  registry.registerAll(NATIVE_PLUGINS);

  const features = Object.keys(ADDON_FOLDERS) as FeatureKey[];
  for (const feature of features) {
    if (nativeIds.has(feature)) continue;
    registry.register(toPluginManifest(feature));
  }

  cachedRegistry = registry;
  return registry;
}