import { FEATURE_CONTRIBUTIONS } from "../../featureContributions.js";
import { PLUGIN_METADATA } from "../../generator/pluginMetadata.js";
import { definePlugin } from "../definePlugin.js";

/**
 * Native manifest for the Realtime plugin.
 */
export const realtimePlugin = definePlugin({
  id: "realtime",
  name: PLUGIN_METADATA.realtime.name,
  version: "1.0.0",
  description: PLUGIN_METADATA.realtime.description,
  category: "infrastructure",
  author: "Nova",
  license: "MIT",
  trustLevel: "official",
  compatibility: {
    nova: ">=0.1.0",
  },
  tags: ["realtime", "sse", "events", "notifications", "streaming", "websocket"],
  capabilities: PLUGIN_METADATA.realtime.capabilities,
  owns: PLUGIN_METADATA.realtime.owns,
  dependencies: FEATURE_CONTRIBUTIONS.realtime.dependencies,
  devDependencies: FEATURE_CONTRIBUTIONS.realtime.devDependencies,
  scripts: FEATURE_CONTRIBUTIONS.realtime.scripts,
  requires: PLUGIN_METADATA.realtime.requires,
  conflicts: PLUGIN_METADATA.realtime.conflicts,
  supportedUI: PLUGIN_METADATA.realtime.supportedUI,
  env: [
    {
      key: "NEXT_PUBLIC_REALTIME_URL",
      example: "/api/realtime",
      description: "Endpoint URL for Server-Sent Events / real-time streaming.",
      required: false,
    },
    {
      key: "REALTIME_HEARTBEAT_INTERVAL",
      example: "15000",
      description: "Heartbeat interval in milliseconds to keep SSE connections alive.",
      required: false,
    },
  ],
});
