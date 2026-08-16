import fs from "fs-extra";
import path from "node:path";

import type { FeatureFlags } from "../../types.js";
import type { MiddlewareContribution } from "./types.js";

/**
 * Proxy contributions, gated by a feature flag and guarded by a
 * marker string so re-running generation never double-wraps the exported
 * handler.
 */
const PROXY_CONTRIBUTIONS: MiddlewareContribution[] = [];

export async function patchMiddleware(targetDir: string, features: FeatureFlags): Promise<void> {
  if (PROXY_CONTRIBUTIONS.length === 0) return;

  const proxyPath = path.join(targetDir, "src", "proxy.ts");
  if (!(await fs.pathExists(proxyPath))) return;

  let content = await fs.readFile(proxyPath, "utf8");
  let changed = false;

  for (const contribution of PROXY_CONTRIBUTIONS) {
    if (!features[contribution.feature]) continue;
    if (content.includes(contribution.marker)) continue; // already applied
    content = contribution.transform(content);
    changed = true;
  }

  if (changed) {
    await fs.writeFile(proxyPath, content, "utf8");
  }
}