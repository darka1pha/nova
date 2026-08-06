import fs from "fs-extra";
import path from "node:path";

import type { PluginRegistry } from "./registry.js";
import type { PluginId, PluginResolutionContext } from "./types.js";

export interface ApplyDocsResult {
  /** Doc paths (relative to the project root) that were written. */
  writtenDocs: string[];
  /** Doc paths that already existed on disk and were left untouched. */
  skippedDocs: string[];
}

/**
 * Writes every `DocContribution` declared by each enabled plugin (in
 * `enabledPlugins` order) to disk, rendering each with the shared
 * `PluginResolutionContext` so a doc can reference the project's
 * package manager, UI library, or the plugin's own prompt answers (e.g.
 * `dockerComposePlugin`'s doc mentioning whether Postgres was included).
 *
 * A doc path that already exists on disk is left untouched rather than
 * overwritten - this keeps the contribution non-destructive with respect
 * to base-template docs (e.g. `templates/base/docs/prisma.md`, which
 * ships unconditionally and isn't owned by the Prisma plugin) and mirrors
 * `nova add`'s existing "never clobber what's already there" convention
 * (`src/projectStructure.ts`'s `copyAddonWithRemap`). A plugin that wants
 * its doc to definitely land should pick a path nothing else writes to.
 */
export async function writePluginDocs(
  targetDir: string,
  enabledPlugins: PluginId[],
  registry: PluginRegistry,
  ctx: PluginResolutionContext,
): Promise<ApplyDocsResult> {
  const writtenDocs: string[] = [];
  const skippedDocs: string[] = [];

  for (const id of enabledPlugins) {
    const plugin = registry.getPlugin(id);
    if (!plugin?.docs?.length) continue;

    for (const doc of plugin.docs) {
      const targetPath = path.join(targetDir, ...doc.path.split("/"));

      if (await fs.pathExists(targetPath)) {
        skippedDocs.push(doc.path);
        continue;
      }

      const content = doc.render(ctx);
      await fs.ensureDir(path.dirname(targetPath));
      await fs.writeFile(targetPath, content, "utf8");
      writtenDocs.push(doc.path);
    }
  }

  return { writtenDocs, skippedDocs };
}