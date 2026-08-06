import type { PluginManifest } from "./types.js";

/**
 * Identity helper for authoring plugin manifests. Exists purely for
 * ergonomics and type inference at the call site (`definePlugin({ ... })`
 * gets full `PluginManifest` autocomplete/checking without an explicit
 * type annotation) - mirrors the `defineConfig()` convention used by
 * Vite/Astro/Vitest, per the Phase 2 brief's "developer experience" goals.
 */
export function definePlugin(manifest: PluginManifest): PluginManifest {
  return manifest;
}