import type { FeatureKey, UiLibrary } from "../types.js";

export interface PluginMetadata {
  name: string;
  description: string;
  /** Other feature keys that must also be enabled for this plugin to make sense. */
  requires?: FeatureKey[];
  /** Feature keys that cannot be enabled at the same time as this plugin. */
  conflicts?: FeatureKey[];
  /** If set, this plugin is only supported with these UI libraries. */
  supportedUI?: UiLibrary[];
}

/**
 * Declarative metadata for every addon. This is the single place that
 * describes cross-plugin relationships (requires/conflicts) so the
 * generator can validate a selection before writing anything to disk,
 * instead of discovering incompatibilities mid-generation.
 *
 * Deliberately conservative for Phase 1: nothing here currently declares a
 * hard conflict or requirement, since today's plugins are all designed to
 * be independently optional (see scripts/smoke-test.mjs, which exercises
 * many combinations together). New plugins should fill these fields in as
 * real constraints are identified, and `validatePluginSelection` will start
 * enforcing them automatically.
 */
export const PLUGIN_METADATA: Record<FeatureKey, PluginMetadata> = {
  prisma: { name: "Prisma ORM", description: "PostgreSQL-ready schema + client singleton" },
  betterAuth: { name: "Better Auth", description: "Full session/auth system" },
  tanstackQuery: { name: "TanStack Query", description: "Client-side data fetching/caching" },
  cypress: { name: "Cypress", description: "E2E testing" },
  vitest: { name: "Vitest", description: "Unit/component testing" },
  storybook: { name: "Storybook", description: "Component workshop" },
  docker: { name: "Docker", description: "Multi-stage production Dockerfile" },
  dockerCompose: {
    name: "Docker Compose (dev)",
    description: "Local services (Postgres, Redis, Mailpit)",
  },
  husky: { name: "Husky + lint-staged", description: "Git hooks" },
  pwa: { name: "PWA support", description: "Manifest + service worker" },
  bundleAnalyzer: { name: "Bundle Analyzer", description: "@next/bundle-analyzer" },
  zustand: { name: "Zustand", description: "Small typed client-state store" },
  msw: { name: "MSW", description: "Mock API/fetch handlers for dev and tests" },
  reactEmail: { name: "React Email", description: "Transactional email templates" },
  playwright: { name: "Playwright", description: "Modern cross-browser E2E tests" },
  sentry: { name: "Sentry", description: "Error monitoring and tracing hooks" },
  openapi: { name: "OpenAPI typed client", description: "Generate types from backend contracts" },
  redis: { name: "Redis", description: "Redis client and optional caching utilities" },
  mailpit: { name: "Mailpit (local email dev)", description: "Local SMTP inbox for development" },
  health: { name: "Health & readiness endpoints", description: "Liveness/readiness checks" },
  securityHeaders: { name: "Security headers", description: "CSP and common security headers" },
  designSystem: {
    name: "Design System",
    description: "Centralized design tokens and component organization",
  },
  strapi: { name: "Strapi CMS", description: "Headless CMS integration and content API client" },
  animations: {
    name: "Animations (Framer Motion)",
    description: "Pre-built animation variants and utilities",
  },
  tanstackTable: {
    name: "TanStack Table",
    description: "Advanced data tables with sorting, filtering, pagination",
  },
  recharts: { name: "Recharts", description: "Beautiful responsive charts and visualizations" },
  tiptap: {
    name: "Tiptap Rich Text Editor",
    description: "Professional content editor with Markdown/HTML support",
  },
};