import { FEATURE_CONTRIBUTIONS } from "../../featureContributions.js";
import { PLUGIN_METADATA } from "../../generator/pluginMetadata.js";
import { definePlugin } from "../definePlugin.js";

/**
 * Native manifest for the Storage plugin.
 */
export const storagePlugin = definePlugin({
  id: "storage",
  name: PLUGIN_METADATA.storage.name,
  version: "1.0.0",
  description: PLUGIN_METADATA.storage.description,
  category: "storage",
  author: "Nova",
  license: "MIT",
  trustLevel: "official",
  compatibility: {
    nova: ">=0.1.0",
  },
  tags: ["storage", "upload", "s3", "files", "supabase-storage"],
  capabilities: PLUGIN_METADATA.storage.capabilities,
  owns: PLUGIN_METADATA.storage.owns,
  dependencies: FEATURE_CONTRIBUTIONS.storage.dependencies,
  devDependencies: FEATURE_CONTRIBUTIONS.storage.devDependencies,
  scripts: FEATURE_CONTRIBUTIONS.storage.scripts,
  requires: PLUGIN_METADATA.storage.requires,
  conflicts: PLUGIN_METADATA.storage.conflicts,
  supportedUI: PLUGIN_METADATA.storage.supportedUI,
  env: [
    {
      key: "STORAGE_DRIVER",
      example: "local",
      description: "Storage driver: 'local', 's3', or 'supabase'.",
      required: false,
    },
    {
      key: "STORAGE_LOCAL_DIR",
      example: "./uploads",
      description: "Local directory for uploaded files when using local driver.",
      required: false,
    },
    {
      key: "STORAGE_BUCKET_NAME",
      example: "app-uploads",
      description: "Target bucket name for S3 or Supabase Storage.",
      required: false,
    },
  ],
});
