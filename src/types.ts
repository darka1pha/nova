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
}
