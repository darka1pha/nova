import { FEATURE_CONTRIBUTIONS } from "../../featureContributions.js";
import { PLUGIN_METADATA } from "../../generator/pluginMetadata.js";
import { definePlugin } from "../definePlugin.js";

/**
 * Native manifest for the Supabase plugin.
 *
 * Provides official Supabase ecosystem integration: browser client, SSR server
 * client with cookies, middleware session helper, and type helpers.
 */
export const supabasePlugin = definePlugin({
  id: "supabase",
  name: PLUGIN_METADATA.supabase.name,
  version: "1.0.0",
  description: PLUGIN_METADATA.supabase.description,
  category: "database",
  tags: ["supabase", "database", "auth", "storage", "postgres", "realtime"],
  dependencies: FEATURE_CONTRIBUTIONS.supabase.dependencies,
  devDependencies: FEATURE_CONTRIBUTIONS.supabase.devDependencies,
  scripts: FEATURE_CONTRIBUTIONS.supabase.scripts,
  requires: PLUGIN_METADATA.supabase.requires,
  conflicts: PLUGIN_METADATA.supabase.conflicts,
  supportedUI: PLUGIN_METADATA.supabase.supportedUI,
  env: [
    {
      key: "NEXT_PUBLIC_SUPABASE_URL",
      example: "https://your-project.supabase.co",
      description: "Supabase project URL.",
      required: true,
    },
    {
      key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      description: "Supabase anonymous public API key.",
      required: true,
    },
    {
      key: "SUPABASE_SERVICE_ROLE_KEY",
      example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      description: "Supabase service role key for privileged backend operations (never expose to client).",
      required: false,
    },
  ],
});
