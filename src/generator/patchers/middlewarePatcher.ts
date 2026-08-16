import fs from "fs-extra";
import path from "node:path";

import type { FeatureFlags } from "../../types.js";
import type { MiddlewareContribution } from "./types.js";

/**
 * Middleware/proxy contributions, gated by a feature flag and guarded by a
 * marker string so re-running generation never double-wraps the exported
 * handler.
 */
const MIDDLEWARE_CONTRIBUTIONS: MiddlewareContribution[] = [];

export async function patchMiddleware(targetDir: string, features: FeatureFlags): Promise<void> {
  if (MIDDLEWARE_CONTRIBUTIONS.length === 0) return;

  const targetFiles = [
    path.join(targetDir, "src", "proxy.ts"),
    path.join(targetDir, "src", "middleware.ts"),
  ];

  for (const filePath of targetFiles) {
    if (!(await fs.pathExists(filePath))) continue;

    let content = await fs.readFile(filePath, "utf8");
    let changed = false;

    for (const contribution of MIDDLEWARE_CONTRIBUTIONS) {
      if (!features[contribution.feature]) continue;
      if (content.includes(contribution.marker)) continue; // already applied
      content = contribution.transform(content);
      changed = true;
    }

    if (changed) {
      await fs.writeFile(filePath, content, "utf8");
    }
  }
}