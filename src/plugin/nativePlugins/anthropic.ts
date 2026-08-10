import { FEATURE_CONTRIBUTIONS } from "../../featureContributions.js";
import { PLUGIN_METADATA } from "../../generator/pluginMetadata.js";
import { definePlugin } from "../definePlugin.js";

/**
 * Native manifest for Anthropic Claude Provider plugin.
 */
export const anthropicPlugin = definePlugin({
  id: "anthropic",
  name: PLUGIN_METADATA.anthropic.name,
  version: "1.0.0",
  description: PLUGIN_METADATA.anthropic.description,
  category: "ai",
  author: "Nova",
  license: "MIT",
  trustLevel: "official",
  compatibility: {
    nova: ">=0.1.0",
  },
  tags: ["ai", "anthropic", "claude", "llm"],
  capabilities: PLUGIN_METADATA.anthropic.capabilities,
  owns: PLUGIN_METADATA.anthropic.owns,
  dependencies: FEATURE_CONTRIBUTIONS.anthropic.dependencies,
  devDependencies: FEATURE_CONTRIBUTIONS.anthropic.devDependencies,
  scripts: FEATURE_CONTRIBUTIONS.anthropic.scripts,
  requires: PLUGIN_METADATA.anthropic.requires,
  conflicts: PLUGIN_METADATA.anthropic.conflicts,
  supportedUI: PLUGIN_METADATA.anthropic.supportedUI,
  env: [
    {
      key: "ANTHROPIC_API_KEY",
      example: "sk-ant-...",
      description: "Anthropic API key for Claude model access",
      required: true,
    },
  ],
});
