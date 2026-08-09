import { FEATURE_CONTRIBUTIONS } from "../../featureContributions.js";
import { PLUGIN_METADATA } from "../../generator/pluginMetadata.js";
import { definePlugin } from "../definePlugin.js";

/**
 * Native manifest for the GraphQL plugin.
 *
 * Provides a GraphQL Yoga server for Next.js App Router, schema organization,
 * typed codegen configuration, and a typed GraphQL client.
 */
export const graphqlPlugin = definePlugin({
  id: "graphql",
  name: PLUGIN_METADATA.graphql.name,
  version: "1.0.0",
  description: PLUGIN_METADATA.graphql.description,
  category: "developer-experience",
  tags: ["graphql", "yoga", "api", "codegen"],
  dependencies: FEATURE_CONTRIBUTIONS.graphql.dependencies,
  devDependencies: FEATURE_CONTRIBUTIONS.graphql.devDependencies,
  scripts: FEATURE_CONTRIBUTIONS.graphql.scripts,
  requires: PLUGIN_METADATA.graphql.requires,
  conflicts: PLUGIN_METADATA.graphql.conflicts,
  supportedUI: PLUGIN_METADATA.graphql.supportedUI,
  env: [
    {
      key: "NEXT_PUBLIC_GRAPHQL_ENDPOINT",
      example: "/api/graphql",
      description: "GraphQL API endpoint URL.",
      required: false,
    },
  ],
});
