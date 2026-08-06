import fs from "fs-extra";
import path from "node:path";

import type { PluginRegistry } from "./registry.js";
import type { PluginId, PluginResolutionContext } from "./types.js";

export interface ApplyPatchesResult {
  /** Target paths (relative to the project root) that were actually
   * rewritten, in application order. Skipped/no-op patches are omitted. */
  patchedFiles: string[];
}

/**
 * Applies every `PatchContribution` declared by each enabled plugin (in
 * `enabledPlugins` order) against the generated project on disk.
 *
 * This is the Phase 2 replacement for hand-written per-target-file
 * patchers like `src/generator/patchers/middlewarePatcher.ts`: instead of
 * a generator-owned array mapping feature flags to transforms, each
 * plugin declares its own `patches`, and this function is the single
 * place that knows how to apply a `PatchContribution` regardless of which
 * plugin or which target file it's for.
 *
 * Semantics deliberately mirror the Phase 1 patchers it's replacing:
 *  - a patch is skipped entirely if its target file doesn't exist (same
 *    as `patchMiddleware`'s early-return when `middleware.ts` is absent),
 *  - a patch with a `marker` is skipped if that marker is already present
 *    in the file, so re-applying (e.g. a future `nova add` pass reusing
 *    this same executor) can never double-wrap a file,
 *  - a patch that produces unchanged content is treated as a no-op and
 *    not counted as "patched", to keep `patchedFiles` meaningful for
 *    logging/debugging.
 */
export async function applyPluginPatches(
  targetDir: string,
  enabledPlugins: PluginId[],
  registry: PluginRegistry,
  ctx: PluginResolutionContext,
): Promise<ApplyPatchesResult> {
  const patchedFiles: string[] = [];

  for (const id of enabledPlugins) {
    const plugin = registry.getPlugin(id);
    if (!plugin?.patches?.length) continue;

    for (const patch of plugin.patches) {
      const targetPath = path.join(targetDir, ...patch.target.split("/"));

      if (!(await fs.pathExists(targetPath))) continue;

      const content = await fs.readFile(targetPath, "utf8");
      if (patch.marker && content.includes(patch.marker)) continue; // already applied

      const next = patch.transform(content, ctx);
      if (next === content) continue;

      await fs.writeFile(targetPath, next, "utf8");
      patchedFiles.push(patch.target);
    }
  }

  return { patchedFiles };
}