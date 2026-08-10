import type { PluginRegistry } from "./registry.js";
import type { PluginId, PluginResolutionContext } from "./types.js";

export interface PluginValidationIssue {
  plugin: PluginId;
  errors: string[];
}

/**
 * Runs every enabled plugin's own `validate(ctx)` self-check (see
 * `PluginManifest.validate` in `src/plugin/types.ts`) and collects any
 * failures. This is distinct from `resolveDependencyGraph()`
 * (`src/plugin/dependencyGraph.ts`), which only checks `requires`/
 * `conflicts`/cycles across the *selection* - `validate()` lets a plugin
 * reject itself for reasons the dependency graph can't express: Node
 * version, OS, a cross-field check on its own prompt answers, disk space,
 * whatever the plugin author needs.
 *
 * A plugin without a `validate` function is always considered valid (an
 * omitted validator is not a failure). A plugin whose `validate` returns
 * `undefined`/`void`, or `{ ok: true }`, is also considered valid -
 * matching the JSDoc on `PluginValidationResult` ("Returning nothing ...
 * means valid").
 *
 * Returns an empty array when everything is valid. Callers (see
 * `src/generator/index.ts` and `src/add.ts`) are expected to treat a
 * non-empty result as fatal and stop before writing anything to disk.
 */
export function validatePlugins(
  enabledPlugins: PluginId[],
  registry: PluginRegistry,
  ctx: PluginResolutionContext,
): PluginValidationIssue[] {
  const issues: PluginValidationIssue[] = [];

  for (const id of enabledPlugins) {
    const plugin = registry.getPlugin(id);
    if (!plugin) continue;
    const errors: string[] = [];

    // UI framework compatibility check
    if (plugin.supportedUI && plugin.supportedUI.length > 0 && !plugin.supportedUI.includes(ctx.uiLibrary)) {
      errors.push(
        `Plugin "${plugin.name}" does not support UI library "${ctx.uiLibrary}". Supported UI libraries: ${plugin.supportedUI.join(", ")}.`,
      );
    }

    // Package manager compatibility check
    if (
      plugin.supportedPackageManagers &&
      plugin.supportedPackageManagers.length > 0 &&
      !plugin.supportedPackageManagers.includes(ctx.packageManager)
    ) {
      errors.push(
        `Plugin "${plugin.name}" does not support package manager "${ctx.packageManager}". Supported: ${plugin.supportedPackageManagers.join(", ")}.`,
      );
    }

    // Custom plugin validator
    if (plugin.validate) {
      const result = plugin.validate(ctx);
      if (result && !result.ok && result.errors.length > 0) {
        errors.push(...result.errors);
      }
    }

    if (errors.length > 0) {
      issues.push({ plugin: id, errors });
    }
  }

  return issues;
}