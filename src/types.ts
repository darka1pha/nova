import type { PackageManager } from "@nova/core";
export type { PackageManager };

import type { PluginAnswers } from "./plugin/types.js";

export type FeatureKey =
  | "prisma"
  | "drizzle"
  | "betterAuth"
  | "tanstackQuery"
  | "cypress"
  | "vitest"
  | "storybook"
  | "docker"
  | "dockerCompose"
  | "husky"
  | "pwa"
  | "bundleAnalyzer"
  | "zustand"
  | "msw"
  | "reactEmail"
  | "playwright"
  | "sentry"
  | "openapi"
  | "redis"
  | "mailpit"
  | "health"
  | "securityHeaders"
  | "designSystem"
  | "strapi"
  | "animations"
  | "tanstackTable"
  | "recharts"
  | "tiptap"
  | "trpc"
  | "graphql"
  | "supabase"
  | "ai"
  | "openai"
  | "anthropic"
  | "ollama"
  | "storage"
  | "realtime"
  | "payments";

export type FeatureFlags = Record<FeatureKey, boolean>;

export type UiLibrary =
  | "shadcn"
  | "mui"
  | "chakra"
  | "ant"
  | "mantine"
  | "hero"
  | "daisy"
  | "headless";

export type ProjectType = "nextjs" | "react-native" | "expo";

export interface Answers {
  projectName: string;
  projectType?: ProjectType;
  packageManager: PackageManager;
  uiLibrary: UiLibrary;
  installNow: boolean;
  initGit: boolean;
  features: FeatureFlags;
  template?: string;
  preset?: string;

  /**
   * Answers collected from each selected plugin's own `prompts` (see
   * `src/plugin/prompts.ts`), keyed by plugin id then prompt name. Empty
   * (`{}`) when no selected plugin declares any prompts - which, for now,
   * is every plugin except the Phase 2 native examples in
   * `src/plugin/nativePlugins/`. Optional so any code constructing
   * `Answers` before this field existed (e.g. `scripts/smoke-test.mjs`)
   * keeps compiling unchanged.
   */
  pluginAnswers?: PluginAnswers;
}

export interface GenerateProjectOptions {
  onStep?: (step: string) => void;
  /**
   * When true, the operation plan (copying base template, addons, and UI
   * overlay) is built and logged but nothing is written to disk, and the
   * config-patching/README/package.json steps are skipped entirely. Not
   * yet wired into the CLI - reserved for a future `--dry-run` flag - but
   * available today for programmatic callers and tests.
   */
  dryRun?: boolean;
  /** Emits debug-level log output in addition to info/warn/error. */
  verbose?: boolean;
}