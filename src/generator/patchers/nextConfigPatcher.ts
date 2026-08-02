import fs from "fs-extra";
import path from "node:path";

import type { FeatureFlags } from "../../types.js";
import type { NextConfigPlaceholderContribution, NextConfigWrapContribution } from "./types.js";

/**
 * Placeholder swaps, in the exact order the base template's
 * `next.config.mjs` expects them to be resolved. Each placeholder either
 * becomes real config (feature enabled) or is stripped entirely (feature
 * disabled) - see templates/base/next.config.mjs for the markers.
 */
const PLACEHOLDER_CONTRIBUTIONS: NextConfigPlaceholderContribution[] = [
  {
    feature: "docker",
    whenEnabled: (content) => content.replace("// __OUTPUT_STANDALONE__", 'output: "standalone",'),
    whenDisabled: (content) => content.replace("// __OUTPUT_STANDALONE__\n", ""),
  },
  {
    feature: "bundleAnalyzer",
    whenEnabled: (content) =>
      content
        .replace(
          'import createNextIntlPlugin from "next-intl/plugin";',
          'import createNextIntlPlugin from "next-intl/plugin";\nimport bundleAnalyzer from "@next/bundle-analyzer";',
        )
        .replace(
          "// __BUNDLE_ANALYZER__",
          'const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });\nnextConfig = withBundleAnalyzer(nextConfig);',
        ),
    whenDisabled: (content) => content.replace("// __BUNDLE_ANALYZER__\n", ""),
  },
];

/**
 * Wrapping contributions, applied after all placeholder contributions and
 * in this fixed order - `pwa` must wrap `withNextIntl(nextConfig)` before
 * `sentry`'s broader `export default (.+);` regex runs, or Sentry would
 * wrap the un-PWA-wrapped export instead.
 */
const WRAP_CONTRIBUTIONS: NextConfigWrapContribution[] = [
  {
    feature: "pwa",
    transform: (content) =>
      content
        .replace(
          'import createNextIntlPlugin from "next-intl/plugin";',
          'import createNextIntlPlugin from "next-intl/plugin";\nimport withPWAInit from "next-pwa";',
        )
        .replace(
          "export default withNextIntl(nextConfig);",
          'const withPWA = withPWAInit({ dest: "public", disable: process.env.NODE_ENV === "development" });\n\nexport default withPWA(withNextIntl(nextConfig));',
        ),
  },
  {
    feature: "sentry",
    transform: (content) =>
      content
        .replace(
          'import createNextIntlPlugin from "next-intl/plugin";',
          'import createNextIntlPlugin from "next-intl/plugin";\nimport { withSentryConfig } from "@sentry/nextjs";',
        )
        .replace(
          /export default (.+);/,
          'export default withSentryConfig($1, {\n  silent: true,\n  org: process.env.SENTRY_ORG,\n  project: process.env.SENTRY_PROJECT,\n});',
        ),
  },
];

export async function patchNextConfig(targetDir: string, features: FeatureFlags): Promise<void> {
  const configPath = path.join(targetDir, "next.config.mjs");
  let content = await fs.readFile(configPath, "utf8");

  for (const contribution of PLACEHOLDER_CONTRIBUTIONS) {
    content = features[contribution.feature]
      ? contribution.whenEnabled(content)
      : contribution.whenDisabled(content);
  }

  for (const contribution of WRAP_CONTRIBUTIONS) {
    if (features[contribution.feature]) {
      content = contribution.transform(content);
    }
  }

  await fs.writeFile(configPath, content, "utf8");
}