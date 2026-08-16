import { FEATURE_CONTRIBUTIONS } from "../../featureContributions.js";
import { PLUGIN_METADATA } from "../../generator/pluginMetadata.js";
import { definePlugin } from "../definePlugin.js";

/**
 * Native manifest for the Security Headers plugin. Its `patches` entry is
 * applied by the generic `applyPluginPatches()` executor to wrap Next.js 16's
 * `src/proxy.ts` with security headers.
 */
export const securityHeadersPlugin = definePlugin({
  id: "securityHeaders",
  name: PLUGIN_METADATA.securityHeaders.name,
  version: "1.0.0",
  description: PLUGIN_METADATA.securityHeaders.description,
  category: "infrastructure",
  tags: ["security", "headers", "csp"],
  capabilities: PLUGIN_METADATA.securityHeaders.capabilities,
  owns: PLUGIN_METADATA.securityHeaders.owns,
  dependencies: FEATURE_CONTRIBUTIONS.securityHeaders.dependencies,
  devDependencies: FEATURE_CONTRIBUTIONS.securityHeaders.devDependencies,
  scripts: FEATURE_CONTRIBUTIONS.securityHeaders.scripts,
  requires: PLUGIN_METADATA.securityHeaders.requires,
  conflicts: PLUGIN_METADATA.securityHeaders.conflicts,
  supportedUI: PLUGIN_METADATA.securityHeaders.supportedUI,
  patches: [
    {
      target: "src/proxy.ts",
      label: "wrap next-intl proxy to apply security headers",
      marker: "@/lib/security-headers",
      transform: (content) =>
        content
          .replace(
            'import createMiddleware from "next-intl/middleware";',
            'import createMiddleware from "next-intl/middleware";\nimport { applySecurityHeaders } from "@/lib/security-headers";',
          )
          .replace(
            "export default function proxy(request: NextRequest) {\n  return handleRouting(request);\n}",
            `export default async function proxy(request: NextRequest) {
  const response = await handleRouting(request);
  try { applySecurityHeaders(response); } catch (e) { /* noop */ }
  return response;
}`,
          )
          .replace(
            "export default createMiddleware(routing);",
            `const __nova_next_middleware = createMiddleware(routing);

export default async function proxy(request) {
  const response = await __nova_next_middleware(request);
  try { applySecurityHeaders(response); } catch (e) { /* noop */ }
  return response;
}`,
          ),
    },
  ],
});