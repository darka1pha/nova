import { FEATURE_CONTRIBUTIONS } from "../../featureContributions.js";
import { PLUGIN_METADATA } from "../../generator/pluginMetadata.js";
import { definePlugin } from "../definePlugin.js";

/**
 * Native (Phase 2) manifest for the Prisma plugin. Registered in
 * `legacyAdapter.ts`'s `getPluginRegistry()` in place of the
 * legacy-adapted version for `prisma`, so it's picked up automatically by
 * `collectAnswers()`'s plugin-prompt pass without any change to the base
 * generation pipeline (Prisma's `templates`/`patches` still flow through
 * the existing `templates/addons/prisma` overlay + `FEATURE_CONTRIBUTIONS`
 * exactly as before - only the *prompt* is new).
 *
 * The `provider` answer isn't consumed by generation yet (that's a later
 * pass, once `patches`/`templates` contributions read from
 * `PluginResolutionContext.answers`) - this manifest demonstrates the
 * prompt wiring end-to-end ahead of that.
 *
 * `env` declares `DATABASE_URL` - deliberately the *same* key already
 * present in `templates/base/.env.example`. This is intentional: it
 * demonstrates `appendPluginEnvContributions()`'s dedup behavior (see
 * `src/plugin/applyEnv.ts`) - the contribution is silently skipped
 * because the key already exists, rather than producing a duplicate
 * entry. A plugin whose addon template doesn't already ship the variable
 * would have it appended for real.
 */
export const prismaPlugin = definePlugin({
  id: "prisma",
  name: PLUGIN_METADATA.prisma.name,
  version: "1.0.0",
  description: PLUGIN_METADATA.prisma.description,
  category: "database",
  tags: ["orm", "prisma"],
  dependencies: FEATURE_CONTRIBUTIONS.prisma.dependencies,
  devDependencies: FEATURE_CONTRIBUTIONS.prisma.devDependencies,
  scripts: FEATURE_CONTRIBUTIONS.prisma.scripts,
  requires: PLUGIN_METADATA.prisma.requires,
  conflicts: PLUGIN_METADATA.prisma.conflicts,
  supportedUI: PLUGIN_METADATA.prisma.supportedUI,
  prompts: [
    {
      type: "select",
      name: "provider",
      message: "Which database should Prisma target?",
      default: "postgresql",
      options: [
        { value: "postgresql", label: "PostgreSQL" },
        { value: "mysql", label: "MySQL" },
        { value: "sqlite", label: "SQLite" },
        { value: "mongodb", label: "MongoDB" },
      ],
    },
  ],
  env: [
    {
      key: "DATABASE_URL",
      example: "postgresql://user:password@localhost:5432/app_db?schema=public",
      description: "Prisma datasource connection string.",
      required: true,
    },
  ],
});