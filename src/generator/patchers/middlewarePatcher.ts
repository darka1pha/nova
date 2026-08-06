import fs from "fs-extra";
import path from "node:path";

import type { FeatureFlags } from "../../types.js";
import type { MiddlewareContribution } from "./types.js";

/**
 * Middleware contributions, gated by a feature flag and guarded by a
 * marker string so re-running generation never double-wraps the exported
 * handler. New plugins that need to touch `src/middleware.ts` should
 * prefer declaring a `PatchContribution` on their own `PluginManifest`
 * (see `src/plugin/types.ts` and `src/plugin/applyPatches.ts`) instead of
 * adding an entry here - this array is kept only for any transform that
 * hasn't migrated to a plugin manifest yet.
 *
 * `securityHeaders` previously lived here; it has migrated to
 * `src/plugin/nativePlugins/securityHeaders.ts` and is now applied by
 * `applyPluginPatches()` in `src/generator/index.ts` instead of by this
 * function, with an identical transform/marker so generated output is
 * unchanged.
 */
const MIDDLEWARE_CONTRIBUTIONS: MiddlewareContribution[] = [];

export async function patchMiddleware(targetDir: string, features: FeatureFlags): Promise<void> {
  if (MIDDLEWARE_CONTRIBUTIONS.length === 0) return;

  const middlewarePath = path.join(targetDir, "src", "middleware.ts");
  if (!(await fs.pathExists(middlewarePath))) return;

  let content = await fs.readFile(middlewarePath, "utf8");
  let changed = false;

  for (const contribution of MIDDLEWARE_CONTRIBUTIONS) {
    if (!features[contribution.feature]) continue;
    if (content.includes(contribution.marker)) continue; // already applied
    content = contribution.transform(content);
    changed = true;
  }

  if (changed) {
    await fs.writeFile(middlewarePath, content, "utf8");
  }
}