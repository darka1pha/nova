import type { PackageManager } from "@nova/core";

export type FeatureKey =
  | "prisma"
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
  | "tiptap";

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

export interface Answers {
  projectName: string;
  packageManager: PackageManager;
  uiLibrary: UiLibrary;
  installNow: boolean;
  initGit: boolean;
  features: FeatureFlags;
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