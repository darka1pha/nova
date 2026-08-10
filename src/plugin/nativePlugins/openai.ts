import { FEATURE_CONTRIBUTIONS } from "../../featureContributions.js";
import { PLUGIN_METADATA } from "../../generator/pluginMetadata.js";
import { definePlugin } from "../definePlugin.js";

/**
 * Native manifest for OpenAI Provider plugin.
 */
export const openaiPlugin = definePlugin({
  id: "openai",
  name: PLUGIN_METADATA.openai.name,
  version: "1.0.0",
  description: PLUGIN_METADATA.openai.description,
  category: "ai",
  author: "Nova",
  license: "MIT",
  trustLevel: "official",
  compatibility: {
    nova: ">=0.1.0",
  },
  tags: ["ai", "openai", "gpt-4", "llm"],
  capabilities: PLUGIN_METADATA.openai.capabilities,
  owns: PLUGIN_METADATA.openai.owns,
  dependencies: FEATURE_CONTRIBUTIONS.openai.dependencies,
  devDependencies: FEATURE_CONTRIBUTIONS.openai.devDependencies,
  scripts: FEATURE_CONTRIBUTIONS.openai.scripts,
  requires: PLUGIN_METADATA.openai.requires,
  conflicts: PLUGIN_METADATA.openai.conflicts,
  supportedUI: PLUGIN_METADATA.openai.supportedUI,
  env: [
    {
      key: "OPENAI_API_KEY",
      example: "sk-proj-...",
      description: "OpenAI API key for language model access",
      required: true,
    },
  ],
});
