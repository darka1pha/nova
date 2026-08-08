import { bail, type PackageManager } from "@nova/core";
import * as p from "@clack/prompts";
import pc from "picocolors";

import { getPluginRegistry } from "./plugin/legacyAdapter.js";
import { runPluginPrompts } from "./plugin/prompts.js";
import type { Answers, FeatureKey, UiLibrary } from "./types.js";

// Shared with src/index.ts validation for CLI-argument project names so
// the interactive prompt and the `nova <name>` argument path enforce
// the exact same rule. Deliberately excludes "." and "/" so a project name
// can never resolve outside the target directory in generator.ts.
const PROJECT_NAME_PATTERN = /^[a-z0-9-_]+$/i;

export function isValidProjectName(name: string): boolean {
  return PROJECT_NAME_PATTERN.test(name);
}

/**
 * Distributes over FeatureKey so the resulting type is a union of exact
 * shapes - `{ value: "prisma"; ... } | { value: "betterAuth"; ... } | ...`
 * - matching what clack's `multiselect<Value>` expects for its `options`
 * array. Do NOT replace this with `Array<{ value: FeatureKey; ... }>`
 * (widens `value` to the whole union on every element, so no element
 * matches its narrowed variant) or with an `as const` array (produces a
 * `readonly` tuple, which clack's option type rejects because it wants a
 * mutable `{ value: unknown; ... }[]`).
 */
type FeatureOption<K extends FeatureKey = FeatureKey> = K extends FeatureKey
  ? { value: K; label: string; hint?: string }
  : never;

// Exported so both the initial "nova <name>" generation flow and the
// incremental "nova add" command (src/index.ts) present the exact same
// feature list/hints instead of maintaining two copies.
export const FEATURE_OPTIONS: FeatureOption[] = [
  { value: "prisma", label: "Prisma ORM", hint: "PostgreSQL-ready schema + client singleton" },
  { value: "drizzle", label: "Drizzle ORM", hint: "Type-safe SQL ORM + migrations (conflicts with Prisma)" },
  { value: "betterAuth", label: "Better Auth", hint: "Full session/auth system" },
  { value: "tanstackQuery", label: "TanStack Query", hint: "Client-side data fetching/caching" },
  { value: "cypress", label: "Cypress", hint: "E2E testing" },
  { value: "vitest", label: "Vitest", hint: "Unit/component testing" },
  { value: "storybook", label: "Storybook", hint: "Component workshop" },
  { value: "docker", label: "Docker", hint: "Multi-stage production Dockerfile" },
  { value: "husky", label: "Husky + lint-staged", hint: "Git hooks" },
  { value: "pwa", label: "PWA support", hint: "Manifest + service worker" },
  { value: "bundleAnalyzer", label: "Bundle Analyzer", hint: "@next/bundle-analyzer" },
  { value: "zustand", label: "Zustand", hint: "Small typed client-state store" },
  { value: "msw", label: "MSW", hint: "Mock API/fetch handlers for dev and tests" },
  { value: "reactEmail", label: "React Email", hint: "Transactional email templates" },
  { value: "mailpit", label: "Mailpit (local email dev)", hint: "Local SMTP inbox for development" },
  { value: "playwright", label: "Playwright", hint: "Modern cross-browser E2E tests" },
  { value: "sentry", label: "Sentry", hint: "Error monitoring and tracing hooks" },
  { value: "openapi", label: "OpenAPI typed client", hint: "Generate types from backend contracts" },
  { value: "redis", label: "Redis", hint: "Redis client and optional caching utilities" },
  { value: "dockerCompose", label: "Docker Compose (dev)", hint: "Local services (Postgres, Redis, Mailpit)" },
  { value: "health", label: "Health & readiness endpoints", hint: "Liveness/readiness checks" },
  { value: "securityHeaders", label: "Security headers", hint: "CSP and common security headers" },
  { value: "designSystem", label: "Design System", hint: "Centralized design tokens and component organization" },
  { value: "strapi", label: "Strapi CMS", hint: "Headless CMS integration and content API client" },
  { value: "animations", label: "Animations (Framer Motion)", hint: "Pre-built animation variants and utilities" },
  { value: "tanstackTable", label: "TanStack Table", hint: "Advanced data tables with sorting, filtering, pagination" },
  { value: "recharts", label: "Recharts", hint: "Beautiful responsive charts and visualizations" },
  { value: "tiptap", label: "Tiptap Rich Text Editor", hint: "Professional content editor with Markdown/HTML support" },
];

export async function collectAnswers(cliProjectName?: string): Promise<Answers> {
  p.intro(pc.bgCyan(pc.black(" nova ")));

  // A name passed as a CLI argument previously bypassed validation entirely,
  // allowing invalid names (spaces, path separators, "..") to reach
  // path.resolve() in generator.ts. Validate it up front instead of trusting it.
  if (cliProjectName && !isValidProjectName(cliProjectName)) {
    p.log.error(
      `Invalid project name "${cliProjectName}". Use only letters, numbers, dashes, or underscores.`,
    );
    process.exit(1);
  }

  const projectNameInput = cliProjectName ?? (await p.text({
    message: "What is your project named?",
    placeholder: "my-enterprise-app",
    validate: (value) => {
      if (!value) return "Project name is required";
      if (!isValidProjectName(value)) {
        return "Use letters, numbers, dashes or underscores only";
      }
    },
  }));

  bail(projectNameInput);
  const projectName = projectNameInput;

  const packageManagerInput = await p.select<PackageManager>({
    message: "Which package manager do you want to use?",
    options: [
      { value: "pnpm", label: "pnpm (recommended)" },
      { value: "npm", label: "npm" },
      { value: "yarn", label: "yarn" },
      { value: "bun", label: "bun" },
    ],
  });
  bail(packageManagerInput);
  const packageManager = packageManagerInput;

  const uiLibraryInput = await p.select<UiLibrary>({
    message: "Which UI library should the app scaffold use?",
    options: [
      { value: "shadcn", label: "shadcn-style primitives (recommended)", hint: "Tailwind + Radix source components" },
      { value: "mui", label: "Material UI", hint: "MUI provider, theme, and examples" },
      { value: "chakra", label: "Chakra UI", hint: "Chakra provider and examples" },
      { value: "ant", label: "Ant Design", hint: "Ant Design components and ConfigProvider" },
      { value: "mantine", label: "Mantine", hint: "Mantine provider, theme, notifications" },
      { value: "hero", label: "NextUI / HeroUI", hint: "NextUI provider and primitives" },
      { value: "daisy", label: "DaisyUI (Tailwind plugin)", hint: "DaisyUI themes for Tailwind" },
      { value: "headless", label: "Headless UI (Tailwind)", hint: "Headless UI primitives + Heroicons" },
    ],
  });
  bail(uiLibraryInput);
  const uiLibrary = uiLibraryInput;

  const features = await p.multiselect<FeatureKey>({
    message: "Select additional features (space to toggle, enter to confirm)",
    required: false,
    options: FEATURE_OPTIONS,
  });
  bail(features);

  let installNow = false;
  if (!process.env.CI) {
    const installNowInput = await p.confirm({
      message: "Install dependencies now?",
      initialValue: true,
    });
    bail(installNowInput);
    installNow = installNowInput;
  }

  const initGitInput = await p.confirm({
    message: "Initialize a git repository?",
    initialValue: true,
  });
  bail(initGitInput);
  const initGit = initGitInput;

  const featureSet = new Set(Array.isArray(features) ? features : []);

  // Ask each selected plugin's own prompts (if it declares any) right
  // after the feature selection, so plugin-specific follow-up questions
  // (e.g. Prisma's database provider) appear in a natural place in the
  // flow instead of being hardcoded here. Plugins with no `prompts`
  // contribute nothing and add no extra steps - see
  // src/plugin/prompts.ts.
  const pluginRegistry = getPluginRegistry();
  const pluginAnswers = await runPluginPrompts(Array.from(featureSet), pluginRegistry);

  return {
    projectName,
    packageManager,
    uiLibrary,
    installNow: Boolean(installNow),
    initGit: Boolean(initGit),
    features: {
      prisma: featureSet.has("prisma"),
      drizzle: featureSet.has("drizzle"),
      betterAuth: featureSet.has("betterAuth"),
      tanstackQuery: featureSet.has("tanstackQuery"),
      cypress: featureSet.has("cypress"),
      vitest: featureSet.has("vitest"),
      storybook: featureSet.has("storybook"),
      docker: featureSet.has("docker"),
      husky: featureSet.has("husky"),
      pwa: featureSet.has("pwa"),
      bundleAnalyzer: featureSet.has("bundleAnalyzer"),
      zustand: featureSet.has("zustand"),
      msw: featureSet.has("msw"),
      reactEmail: featureSet.has("reactEmail"),
      playwright: featureSet.has("playwright"),
      sentry: featureSet.has("sentry"),
      openapi: featureSet.has("openapi"),
      redis: featureSet.has("redis"),
      mailpit: featureSet.has("mailpit"),
      dockerCompose: featureSet.has("dockerCompose"),
      health: featureSet.has("health"),
      securityHeaders: featureSet.has("securityHeaders"),
      designSystem: featureSet.has("designSystem"),
      strapi: featureSet.has("strapi"),
      animations: featureSet.has("animations"),
      tanstackTable: featureSet.has("tanstackTable"),
      recharts: featureSet.has("recharts"),
      tiptap: featureSet.has("tiptap"),
    },
    pluginAnswers,
  };
}