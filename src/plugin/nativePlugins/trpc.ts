import { FEATURE_CONTRIBUTIONS } from "../../featureContributions.js";
import { PLUGIN_METADATA } from "../../generator/pluginMetadata.js";
import { definePlugin } from "../definePlugin.js";

/**
 * Native manifest for the tRPC plugin.
 *
 * Provides full end-to-end type-safe API integration with Next.js App Router,
 * including router, procedures, context, client, and React Query provider.
 */
export const trpcPlugin = definePlugin({
  id: "trpc",
  name: PLUGIN_METADATA.trpc.name,
  version: "1.0.0",
  description: PLUGIN_METADATA.trpc.description,
  category: "developer-experience",
  tags: ["api", "trpc", "typesafe", "rpc"],
  dependencies: FEATURE_CONTRIBUTIONS.trpc.dependencies,
  devDependencies: FEATURE_CONTRIBUTIONS.trpc.devDependencies,
  scripts: FEATURE_CONTRIBUTIONS.trpc.scripts,
  requires: PLUGIN_METADATA.trpc.requires,
  conflicts: PLUGIN_METADATA.trpc.conflicts,
  supportedUI: PLUGIN_METADATA.trpc.supportedUI,
  env: [
    {
      key: "NEXT_PUBLIC_APP_URL",
      example: "http://localhost:3000",
      description: "Base application URL for SSR and tRPC client requests.",
      required: false,
    },
  ],
});
