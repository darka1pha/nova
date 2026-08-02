import fs from "fs-extra";
import path from "node:path";

import type { FeatureFlags } from "../../types.js";
import type { MiddlewareContribution } from "./types.js";

/**
 * Middleware contributions, gated by a feature flag and guarded by a
 * marker string so re-running generation (or a future `nova add`
 * middleware step) never double-wraps the exported handler. New plugins
 * that need to touch `src/middleware.ts` register here.
 */
const MIDDLEWARE_CONTRIBUTIONS: MiddlewareContribution[] = [
  {
    feature: "securityHeaders",
    marker: "@/lib/security-headers",
    transform: (content) =>
      content
        .replace(
          'import createMiddleware from "next-intl/middleware";',
          'import createMiddleware from "next-intl/middleware";\nimport { applySecurityHeaders } from "@/lib/security-headers";',
        )
        .replace(
          "export default createMiddleware(routing);",
          `const __nova_next_middleware = createMiddleware(routing);

export default async function middleware(request) {
  const response = await __nova_next_middleware(request);
  try { applySecurityHeaders(response); } catch (e) { /* noop */ }
  return response;
}`,
        ),
  },
];

export async function patchMiddleware(targetDir: string, features: FeatureFlags): Promise<void> {
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