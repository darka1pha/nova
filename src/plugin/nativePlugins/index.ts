import { dockerComposePlugin } from "./dockerCompose.js";
import { drizzlePlugin } from "./drizzle.js";
import { prismaPlugin } from "./prisma.js";
import { securityHeadersPlugin } from "./securityHeaders.js";
import type { PluginManifest } from "../types.js";

/**
 * Every plugin authored directly against the Phase 2 `PluginManifest`
 * shape (as opposed to ones only reachable via `toPluginManifest()`'s
 * legacy adaptation). `getPluginRegistry()` in `legacyAdapter.ts`
 * registers these first, then fills in every remaining `FeatureKey` via
 * the adapter - so a plugin only needs to move here once, and the rest of
 * the platform (registry lookups, the dependency graph, prompt execution,
 * patch application) doesn't need to know which path a given plugin came
 * from.
 */
export const NATIVE_PLUGINS: PluginManifest[] = [
  prismaPlugin,
  drizzlePlugin,
  dockerComposePlugin,
  securityHeadersPlugin,
];