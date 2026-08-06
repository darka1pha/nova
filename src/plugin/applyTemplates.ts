import { copyTemplateDir, pathExists } from "@nova/core";
import path from "node:path";

import type { PluginRegistry } from "./registry.js";
import type { PluginId, PluginResolutionContext } from "./types.js";

export interface ApplyTemplatesResult {
  /** Absolute source directories actually copied, in application order. */
  appliedTemplates: string[];
  /** Source directories a plugin declared that were skipped because they
   * don't exist on disk, or because their `when` condition returned false. */
  skippedTemplates: string[];
}

/**
 * Applies every `TemplateContribution` declared by each enabled plugin (in
 * `enabledPlugins` order) on top of the project already on disk.
 *
 * This is the Phase 2 counterpart to the Phase 1 `ADDON_FOLDERS` overlay
 * copy in `src/generator/index.ts` (and its `nova add` equivalent,
 * `copyAddonWithRemap()` in `src/projectStructure.ts`): instead of the
 * generator/CLI hardcoding "this feature's files live at
 * templates/addons/<folder>", a plugin can declare one or more
 * `TemplateContribution`s directly on its own manifest, each optionally
 * gated by a `when(ctx)` predicate (e.g. only copy a Postgres compose
 * fragment when that plugin's own prompt answered "postgres").
 *
 * Semantics mirror `copyTemplateDir()` (see `packages/core/src/fs.ts`):
 * overlay files win - copying is `overwrite: true`, so a later plugin's
 * template can intentionally replace an earlier one's file at the same
 * path, exactly like the existing `templates/addons/*` overlay model.
 *
 * No currently-registered plugin (native or legacy-adapted) declares
 * `templates` yet, so calling this today is always a no-op - it exists so
 * a plugin can migrate its file overlay off `ADDON_FOLDERS` and onto its
 * own manifest without any further generator/`nova add` changes.
 */
export async function applyPluginTemplates(
  targetDir: string,
  enabledPlugins: PluginId[],
  registry: PluginRegistry,
  ctx: PluginResolutionContext,
): Promise<ApplyTemplatesResult> {
  const appliedTemplates: string[] = [];
  const skippedTemplates: string[] = [];

  for (const id of enabledPlugins) {
    const plugin = registry.getPlugin(id);
    if (!plugin?.templates?.length) continue;

    for (const contribution of plugin.templates) {
      if (contribution.when && !contribution.when(ctx)) {
        skippedTemplates.push(contribution.src);
        continue;
      }

      const srcDir = path.isAbsolute(contribution.src)
        ? contribution.src
        : path.resolve(process.cwd(), contribution.src);

      if (!(await pathExists(srcDir))) {
        skippedTemplates.push(srcDir);
        continue;
      }

      await copyTemplateDir(srcDir, targetDir);
      appliedTemplates.push(srcDir);
    }
  }

  return { appliedTemplates, skippedTemplates };
}