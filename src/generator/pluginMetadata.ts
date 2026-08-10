import type { PluginCapability } from "../plugin/types.js";
import type { FeatureKey, UiLibrary } from "../types.js";

export interface PluginMetadata {
  name: string;
  description: string;
  capabilities?: PluginCapability[];
  owns?: string[];
  /** Other feature keys that must also be enabled for this plugin to make sense. */
  requires?: FeatureKey[];
  /** Feature keys that cannot be enabled at the same time as this plugin. */
  conflicts?: FeatureKey[];
  /** Human-readable reasons for declared conflicts. */
  conflictReasons?: Partial<Record<FeatureKey, string>>;
  /** If set, this plugin is only supported with these UI libraries. */
  supportedUI?: UiLibrary[];
}

/**
 * Declarative metadata for every addon. This is the single place that
 * describes cross-plugin relationships (requires/conflicts), capabilities,
 * and ownership so the generator and CLI can validate, inspect, and plan
 * changes safely before touching the filesystem.
 */
export const PLUGIN_METADATA: Record<FeatureKey, PluginMetadata> = {
  prisma: {
    name: "Prisma ORM",
    description: "PostgreSQL-ready schema + client singleton",
    capabilities: ["database"],
    owns: ["prisma/schema.prisma", "src/lib/prisma/client.ts", "database:schema", "database:migrations"],
    conflicts: ["drizzle"],
    conflictReasons: {
      drizzle: "Prisma and Drizzle both provide database schema and migration ownership.",
    },
  },
  drizzle: {
    name: "Drizzle ORM",
    description:
      "Lightweight, type-safe SQL ORM with migrations (PostgreSQL via postgres-js by default)",
    capabilities: ["database"],
    owns: ["drizzle.config.ts", "src/lib/db/schema.ts", "src/lib/db/client.ts", "database:schema", "database:migrations"],
    conflicts: ["prisma"],
    conflictReasons: {
      prisma: "Prisma and Drizzle both provide database schema and migration ownership.",
    },
  },
  betterAuth: {
    name: "Better Auth",
    description: "Full session/auth system",
    capabilities: ["authentication"],
    owns: ["src/lib/auth/better-auth.ts"],
  },
  tanstackQuery: {
    name: "TanStack Query",
    description: "Client-side data fetching/caching",
    capabilities: ["state-management", "api"],
    owns: ["src/providers/query-provider.tsx"],
  },
  cypress: {
    name: "Cypress",
    description: "E2E testing",
    capabilities: ["testing"],
    owns: ["cypress.config.ts", "cypress/"],
  },
  vitest: {
    name: "Vitest",
    description: "Unit/component testing",
    capabilities: ["testing"],
    owns: ["vitest.config.ts"],
  },
  storybook: {
    name: "Storybook",
    description: "Component workshop",
    capabilities: ["developer-experience", "ui"],
    owns: [".storybook/"],
  },
  docker: {
    name: "Docker",
    description: "Multi-stage production Dockerfile",
    capabilities: ["infrastructure", "deployment"],
    owns: ["Dockerfile", ".dockerignore"],
  },
  dockerCompose: {
    name: "Docker Compose (dev)",
    description: "Local services (Postgres, Redis, Mailpit)",
    capabilities: ["infrastructure"],
    owns: ["docker-compose.yml"],
  },
  husky: {
    name: "Husky + lint-staged",
    description: "Git hooks",
    capabilities: ["developer-experience"],
    owns: [".husky/"],
  },
  pwa: {
    name: "PWA support",
    description: "Manifest + service worker",
    capabilities: ["infrastructure", "mobile"],
    owns: ["public/manifest.json"],
  },
  bundleAnalyzer: {
    name: "Bundle Analyzer",
    description: "@next/bundle-analyzer",
    capabilities: ["developer-experience", "observability"],
    owns: ["next.config.mjs:bundleAnalyzer"],
  },
  zustand: {
    name: "Zustand",
    description: "Small typed client-state store",
    capabilities: ["state-management"],
    owns: ["src/stores/"],
  },
  msw: {
    name: "MSW",
    description: "Mock API/fetch handlers for dev and tests",
    capabilities: ["testing", "api"],
    owns: ["src/mocks/"],
  },
  reactEmail: {
    name: "React Email",
    description: "Transactional email templates",
    capabilities: ["email"],
    owns: ["src/emails/", "src/lib/email/"],
  },
  playwright: {
    name: "Playwright",
    description: "Modern cross-browser E2E tests",
    capabilities: ["testing"],
    owns: ["playwright.config.ts", "tests/e2e/"],
  },
  sentry: {
    name: "Sentry",
    description: "Error monitoring and tracing hooks",
    capabilities: ["observability"],
    owns: ["sentry.client.config.ts", "sentry.server.config.ts", "sentry.edge.config.ts", "src/lib/observability/sentry.ts"],
  },
  openapi: {
    name: "OpenAPI typed client",
    description: "Generate types from backend contracts",
    capabilities: ["api", "developer-experience"],
    owns: ["openapi/", "src/lib/api/openapi-client.ts"],
  },
  redis: {
    name: "Redis",
    description: "Redis client and optional caching utilities",
    capabilities: ["database", "infrastructure"],
    owns: ["src/lib/redis/"],
  },
  mailpit: {
    name: "Mailpit (local email dev)",
    description: "Local SMTP inbox for development",
    capabilities: ["email", "infrastructure"],
    owns: ["src/lib/mailpit/"],
  },
  health: {
    name: "Health & readiness endpoints",
    description: "Liveness/readiness checks",
    capabilities: ["infrastructure", "observability"],
    owns: ["src/app/api/health/"],
  },
  securityHeaders: {
    name: "Security headers",
    description: "CSP and common security headers",
    capabilities: ["security", "infrastructure"],
    owns: ["src/lib/security-headers/"],
  },
  designSystem: {
    name: "Design System",
    description: "Centralized design tokens and component organization",
    capabilities: ["ui"],
    owns: ["src/design/"],
  },
  strapi: {
    name: "Strapi CMS",
    description: "Headless CMS integration and content API client",
    capabilities: ["cms", "api"],
    owns: ["src/lib/strapi/"],
  },
  animations: {
    name: "Animations (Framer Motion)",
    description: "Pre-built animation variants and utilities",
    capabilities: ["ui"],
    owns: ["src/lib/animations/"],
  },
  tanstackTable: {
    name: "TanStack Table",
    description: "Advanced data tables with sorting, filtering, pagination",
    capabilities: ["ui"],
    owns: ["src/components/table/"],
  },
  recharts: {
    name: "Recharts",
    description: "Beautiful responsive charts and visualizations",
    capabilities: ["ui"],
    owns: ["src/components/charts/"],
  },
  tiptap: {
    name: "Tiptap Rich Text Editor",
    description: "Professional content editor with Markdown/HTML support",
    capabilities: ["editor", "ui"],
    owns: ["src/components/editor/"],
  },
  trpc: {
    name: "tRPC",
    description: "End-to-end type-safe APIs for Next.js App Router",
    capabilities: ["api", "developer-experience"],
    owns: ["src/lib/trpc/", "src/app/api/trpc/"],
  },
  graphql: {
    name: "GraphQL",
    description: "Production-ready GraphQL Yoga server with typed codegen and request client",
    capabilities: ["api"],
    owns: ["codegen.ts", "src/app/api/graphql/", "src/lib/graphql/"],
  },
  supabase: {
    name: "Supabase",
    description: "Supabase client, SSR authentication, and database integration for Next.js App Router",
    capabilities: ["database", "authentication"],
    owns: ["src/lib/supabase/"],
  },
  ai: {
    name: "Vercel AI SDK",
    description: "Core AI streaming SDK, React hooks, and conversational UI components",
    capabilities: ["ai", "ui", "api"],
    owns: ["src/app/api/chat/", "src/components/ai/", "src/lib/ai/"],
  },
  openai: {
    name: "OpenAI Provider",
    description: "OpenAI model provider integration for Vercel AI SDK",
    capabilities: ["ai"],
    requires: ["ai"],
    owns: ["src/lib/ai/openai.ts"],
  },
  anthropic: {
    name: "Anthropic Provider",
    description: "Anthropic Claude model provider integration for Vercel AI SDK",
    capabilities: ["ai"],
    requires: ["ai"],
    owns: ["src/lib/ai/anthropic.ts"],
  },
  ollama: {
    name: "Ollama Provider",
    description: "Local Ollama model provider integration for Vercel AI SDK",
    capabilities: ["ai"],
    requires: ["ai"],
    owns: ["src/lib/ai/ollama.ts"],
  },
};

