import type { PluginRegistry } from "./registry.js";
import type { PluginHooks, PluginId, PluginResolutionContext } from "./types.js";

export type PluginHookName = keyof PluginHooks;

/**
 * Invokes a single named lifecycle hook (see `PluginHooks` in
 * `src/plugin/types.ts`) on every enabled plugin that declares it, in
 * `enabledPlugins` order, awaiting each in turn.
 *
 * This is the manifest-level counterpart to `src/generator/hooks.ts`'s
 * `HookRegistry`: that registry lets *external* code (a future `nova
 * doctor`, telemetry, etc.) subscribe to coarse generator-wide events
 * without editing `generator.ts`. `runPluginHook` instead lets *plugins
 * themselves* react to the same kind of lifecycle moments, scoped to their
 * own manifest - a plugin's `hooks.afterInstall`, for example, might print
 * a "run `npx prisma generate` next" reminder without the generator
 * knowing anything about Prisma.
 *
 * A plugin with no `hooks` object, or no handler for this particular
 * `hookName`, is silently skipped - most plugins declare none of these,
 * and that's expected, not an error.
 */
export async function runPluginHook(
  hookName: PluginHookName,
  enabledPlugins: PluginId[],
  registry: PluginRegistry,
  ctx: PluginResolutionContext,
): Promise<void> {
  for (const id of enabledPlugins) {
    const plugin = registry.getPlugin(id);
    const handler = plugin?.hooks?.[hookName];
    if (!handler) continue;
    if (hookName === "beforeUpgrade" || hookName === "afterUpgrade") {
      // Handled via runPluginUpgradeHook for parameterized from/to versions
      continue;
    }
    await (handler as (ctx: PluginResolutionContext) => void | Promise<void>)(ctx);
  }
}

export async function runPluginUpgradeHook(
  hookName: "beforeUpgrade" | "afterUpgrade",
  pluginId: PluginId,
  fromVersion: string,
  toVersion: string,
  registry: PluginRegistry,
  ctx: PluginResolutionContext,
): Promise<void> {
  const plugin = registry.getPlugin(pluginId);
  const handler = plugin?.hooks?.[hookName];
  if (!handler) return;
  await handler(fromVersion, toVersion, ctx);
}