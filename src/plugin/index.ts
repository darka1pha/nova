export * from "./types.js";
export { definePlugin } from "./definePlugin.js";
export { PluginRegistry } from "./registry.js";
export { resolveDependencyGraph } from "./dependencyGraph.js";
export type { DependencyGraphResult, DependencyIssue } from "./dependencyGraph.js";
export {
  getLegacyPluginRegistry,
  getPluginRegistry,
  toPluginManifest,
} from "./legacyAdapter.js";
export { runPluginPrompts } from "./prompts.js";
export { applyPluginPatches } from "./applyPatches.js";
export type { ApplyPatchesResult } from "./applyPatches.js";
export { appendPluginEnvContributions } from "./applyEnv.js";
export type { ApplyEnvResult } from "./applyEnv.js";
export { writePluginDocs } from "./applyDocs.js";
export type { ApplyDocsResult } from "./applyDocs.js";
export { NATIVE_PLUGINS } from "./nativePlugins/index.js";