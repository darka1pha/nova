import { FEATURE_CONTRIBUTIONS } from "../../featureContributions.js";
import { PLUGIN_METADATA } from "../../generator/pluginMetadata.js";
import { definePlugin } from "../definePlugin.js";

/**
 * Native manifest for Vercel AI SDK plugin.
 */
export const aiPlugin = definePlugin({
  id: "ai",
  name: PLUGIN_METADATA.ai.name,
  version: "1.0.0",
  description: PLUGIN_METADATA.ai.description,
  category: "ai",
  author: "Nova",
  license: "MIT",
  trustLevel: "official",
  compatibility: {
    nova: ">=0.1.0",
  },
  tags: ["ai", "llm", "chat", "streaming", "vercel-ai"],
  capabilities: PLUGIN_METADATA.ai.capabilities,
  owns: PLUGIN_METADATA.ai.owns,
  dependencies: FEATURE_CONTRIBUTIONS.ai.dependencies,
  devDependencies: FEATURE_CONTRIBUTIONS.ai.devDependencies,
  scripts: FEATURE_CONTRIBUTIONS.ai.scripts,
  requires: PLUGIN_METADATA.ai.requires,
  conflicts: PLUGIN_METADATA.ai.conflicts,
  supportedUI: PLUGIN_METADATA.ai.supportedUI,
});
