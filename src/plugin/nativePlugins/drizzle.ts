import { FEATURE_CONTRIBUTIONS } from "../../featureContributions.js";
import { PLUGIN_METADATA } from "../../generator/pluginMetadata.js";
import { definePlugin } from "../definePlugin.js";

/**
 * Native (Phase 2) manifest for the Drizzle ORM plugin.
 *
 * File overlay (schema, client, drizzle.config.ts, docs) still flows
 * through the legacy `templates/addons/drizzle` folder + `ADDON_FOLDERS`,
 * exactly like `prismaPlugin` - only the package.json footprint, the
 * `conflicts` relationship, and the `DATABASE_URL` env contribution are
 * expressed on the manifest itself.
 *
 * `env` declares the *same* `DATABASE_URL` key already present in
 * `templates/base/.env.example` (shared with Prisma's connection string
 * shape). Because Prisma and Drizzle are mutually exclusive (see
 * `conflicts` below), only one of the two plugins is ever enabled for a
 * given project, so there's never a real collision - this mirrors the
 * dedup demonstration already present in `prismaPlugin`.
 */
export const drizzlePlugin = definePlugin({
  id: "drizzle",
  name: PLUGIN_METADATA.drizzle.name,
  version: "1.0.0",
  description: PLUGIN_METADATA.drizzle.description,
  category: "database",
  tags: ["orm", "drizzle", "postgres", "sql"],
  capabilities: PLUGIN_METADATA.drizzle.capabilities,
  owns: PLUGIN_METADATA.drizzle.owns,
  dependencies: FEATURE_CONTRIBUTIONS.drizzle.dependencies,
  devDependencies: FEATURE_CONTRIBUTIONS.drizzle.devDependencies,
  scripts: FEATURE_CONTRIBUTIONS.drizzle.scripts,
  requires: PLUGIN_METADATA.drizzle.requires,
  conflicts: PLUGIN_METADATA.drizzle.conflicts,
  conflictReasons: PLUGIN_METADATA.drizzle.conflictReasons as Record<string, string> | undefined,
  supportedUI: PLUGIN_METADATA.drizzle.supportedUI,
  env: [
    {
      key: "DATABASE_URL",
      example: "postgresql://user:password@localhost:5432/app_db?schema=public",
      description: "Drizzle datasource connection string (postgres-js driver).",
      required: true,
    },
  ],
});