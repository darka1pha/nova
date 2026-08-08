import type { FeatureKey } from "./types.js";

/**
 * Maps feature flags -> addon overlay folder name under templates/addons.
 * Single source of truth shared by the initial generator (src/generator.ts)
 * and the incremental "nova add" command (src/add.ts), so both always agree
 * on which folder a feature's files live in.
 */
export const ADDON_FOLDERS: Record<FeatureKey, string> = {
  prisma: "prisma",
  drizzle: "drizzle",
  betterAuth: "better-auth",
  cypress: "cypress",
  docker: "docker",
  dockerCompose: "docker-compose",
  husky: "husky",
  storybook: "storybook",
  vitest: "vitest",
  tanstackQuery: "tanstack-query",
  pwa: "pwa",
  bundleAnalyzer: "bundle-analyzer",
  zustand: "zustand",
  msw: "msw",
  reactEmail: "react-email",
  playwright: "playwright",
  sentry: "sentry",
  openapi: "openapi",
  redis: "redis",
  mailpit: "mailpit",
  health: "health",
  securityHeaders: "security-headers",
  designSystem: "design-system",
  strapi: "strapi",
  animations: "animations",
  tanstackTable: "tanstack-table",
  recharts: "recharts",
  tiptap: "tiptap",
};

/**
 * Accepts either the camelCase FeatureKey ("tanstackQuery"), the kebab-case
 * addon folder name ("tanstack-query"), or a case-insensitive variant of
 * either, and resolves it to a FeatureKey. Returns undefined if the input
 * doesn't match any known feature.
 */
export function resolveFeatureKey(input: string): FeatureKey | undefined {
  const normalized = input.trim();
  if (!normalized) return undefined;

  if ((normalized as FeatureKey) in ADDON_FOLDERS) {
    return normalized as FeatureKey;
  }

  const entries = Object.entries(ADDON_FOLDERS) as [FeatureKey, string][];

  const exactFolderMatch = entries.find(([, folder]) => folder === normalized);
  if (exactFolderMatch) return exactFolderMatch[0];

  const lower = normalized.toLowerCase();
  const fuzzyMatch = entries.find(
    ([key, folder]) => key.toLowerCase() === lower || folder.toLowerCase() === lower,
  );

  return fuzzyMatch?.[0];
}

export function listAddableFeatures(): FeatureKey[] {
  return Object.keys(ADDON_FOLDERS) as FeatureKey[];
}