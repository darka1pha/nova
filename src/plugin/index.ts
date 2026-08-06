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
export { applyPluginTemplates } from "./applyTemplates.js";
export type { ApplyTemplatesResult } from "./applyTemplates.js";
export { validatePlugins } from "./validate.js";
export type { PluginValidationIssue } from "./validate.js";
export { runPluginHook } from "./runHooks.js";
export type { PluginHookName } from "./runHooks.js";
export { NATIVE_PLUGINS } from "./nativePlugins/index.js";