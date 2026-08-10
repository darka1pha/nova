import { FEATURE_CONTRIBUTIONS } from "../../featureContributions.js";
import { PLUGIN_METADATA } from "../../generator/pluginMetadata.js";
import { definePlugin } from "../definePlugin.js";

/**
 * Native manifest for Ollama Local Model Provider plugin.
 */
export const ollamaPlugin = definePlugin({
  id: "ollama",
  name: PLUGIN_METADATA.ollama.name,
  version: "1.0.0",
  description: PLUGIN_METADATA.ollama.description,
  category: "ai",
  author: "Nova",
  license: "MIT",
  trustLevel: "official",
  compatibility: {
    nova: ">=0.1.0",
  },
  tags: ["ai", "ollama", "local-llm", "llama"],
  capabilities: PLUGIN_METADATA.ollama.capabilities,
  owns: PLUGIN_METADATA.ollama.owns,
  dependencies: FEATURE_CONTRIBUTIONS.ollama.dependencies,
  devDependencies: FEATURE_CONTRIBUTIONS.ollama.devDependencies,
  scripts: FEATURE_CONTRIBUTIONS.ollama.scripts,
  requires: PLUGIN_METADATA.ollama.requires,
  conflicts: PLUGIN_METADATA.ollama.conflicts,
  supportedUI: PLUGIN_METADATA.ollama.supportedUI,
  env: [
    {
      key: "OLLAMA_BASE_URL",
      example: "http://localhost:11434/api",
      description: "Local Ollama server API endpoint",
      required: false,
    },
  ],
});
