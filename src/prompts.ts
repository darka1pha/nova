import { bail, type PackageManager } from "@nova/core";
import * as p from "@clack/prompts";
import pc from "picocolors";

import { getPluginRegistry } from "./plugin/legacyAdapter.js";
import { runPluginPrompts } from "./plugin/prompts.js";
import { getTemplate, resolveTemplate } from "./templates/registry.js";
import { getPreset, resolvePreset } from "./presets/registry.js";
import { resolveFeatureKey } from "./addonRegistry.js";
import { PLUGIN_METADATA } from "./generator/pluginMetadata.js";
import type { Answers, FeatureFlags, FeatureKey, UiLibrary } from "./types.js";

const PROJECT_NAME_PATTERN = /^[a-z0-9-_]+$/i;

export function isValidProjectName(name: string): boolean {
  return PROJECT_NAME_PATTERN.test(name);
}

type FeatureOption<K extends FeatureKey = FeatureKey> = K extends FeatureKey
  ? { value: K; label: string; hint?: string }
  : never;

export const FEATURE_OPTIONS: FeatureOption[] = [
  { value: "prisma", label: "Prisma ORM", hint: "PostgreSQL-ready schema + client singleton" },
  { value: "drizzle", label: "Drizzle ORM", hint: "Type-safe SQL ORM + migrations (conflicts with Prisma)" },
  { value: "betterAuth", label: "Better Auth", hint: "Full session/auth system" },
  { value: "tanstackQuery", label: "TanStack Query", hint: "Client-side data fetching/caching" },
  { value: "ai", label: "Vercel AI SDK", hint: "AI streaming SDK, React hooks, and chat UI components" },
  { value: "openai", label: "OpenAI Provider", hint: "OpenAI model provider integration" },
  { value: "anthropic", label: "Anthropic Provider", hint: "Claude model provider integration" },
  { value: "ollama", label: "Ollama Provider", hint: "Local Ollama model provider integration" },
  { value: "storage", label: "File Storage", hint: "Multi-driver storage (Local, S3, Supabase)" },
  { value: "realtime", label: "Real-time Events", hint: "Server-Sent Events & live streaming updates" },
  { value: "payments", label: "Payments / Billing", hint: "Provider-ready checkout & subscriptions abstraction" },
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
  { value: "trpc", label: "tRPC", hint: "End-to-end type-safe APIs for Next.js App Router" },
  { value: "graphql", label: "GraphQL", hint: "Yoga server + typed codegen + request client" },
  { value: "supabase", label: "Supabase", hint: "SSR auth, database, and storage integration" },
];

export interface CliCreateOptions {
  template?: string;
  preset?: string;
  uiLibrary?: UiLibrary;
  packageManager?: PackageManager;
  yes?: boolean;
  features?: string[];
  orm?: string;
  installNow?: boolean;
  initGit?: boolean;
}

function buildFeatureFlags(enabledKeys: Iterable<FeatureKey>): FeatureFlags {
  const featureSet = new Set(enabledKeys);
  const flags = {} as FeatureFlags;
  for (const opt of FEATURE_OPTIONS) {
    flags[opt.value] = featureSet.has(opt.value);
  }
  return flags;
}

export async function collectAnswers(
  cliProjectName?: string,
  options: CliCreateOptions = {},
): Promise<Answers> {
  const isNonInteractive = Boolean(options.yes || (process.env.CI && !process.stdin.isTTY));

  if (!isNonInteractive) {
    p.intro(pc.bgCyan(pc.black(" nova ")));
  }

  // 1. Project Name
  let projectName = cliProjectName;
  if (projectName && !isValidProjectName(projectName)) {
    p.log.error(
      `Invalid project name "${projectName}". Use only letters, numbers, dashes, or underscores.`,
    );
    process.exit(1);
  }

  if (!projectName) {
    if (isNonInteractive) {
      projectName = "nova-app";
    } else {
      const projectNameInput = await p.text({
        message: "What is your project named?",
        placeholder: "my-app",
        validate: (value) => {
          if (!value) return "Project name is required";
          if (!isValidProjectName(value)) {
            return "Use letters, numbers, dashes or underscores only";
          }
        },
      });
      bail(projectNameInput);
      projectName = projectNameInput;
    }
  }

  // 2. Precedence Resolution: Template & Preset
  let selectedTemplate = options.template;
  let selectedPreset = options.preset;
  let preconfiguredPlugins: FeatureKey[] = [];
  let defaultUiLibrary: UiLibrary = "shadcn";

  if (selectedTemplate) {
    const tplResolution = resolveTemplate(selectedTemplate);
    if (!tplResolution.valid) {
      throw new Error(tplResolution.issues.join("\n"));
    }
    preconfiguredPlugins = tplResolution.resolvedPlugins;
    defaultUiLibrary = tplResolution.uiLibrary;
  } else if (selectedPreset) {
    const presetResolution = resolvePreset(selectedPreset);
    if (!presetResolution.valid) {
      throw new Error(presetResolution.issues.join("\n"));
    }
    preconfiguredPlugins = presetResolution.resolvedPlugins;
    if (presetResolution.preset.defaultUiLibrary) {
      defaultUiLibrary = presetResolution.preset.defaultUiLibrary;
    }
  } else if (!isNonInteractive) {
    // Interactive Template Choice
    const templateChoice = await p.select<string>({
      message: "Which starter template do you want to use?",
      options: [
        { value: "minimal", label: "Minimal Next.js", hint: "Lean App Router setup with Tailwind CSS and testing" },
        { value: "saas", label: "SaaS Application", hint: "Auth, database, email, storage, billing-ready, and testing" },
        { value: "multi-tenant", label: "B2B Multi-Tenant Platform", hint: "Multi-tenancy, memberships, payment billing, tables, emails" },
        { value: "admin", label: "Admin Dashboard", hint: "Data tables, Recharts visualizations, auth, and state" },
        { value: "ecommerce", label: "E-commerce Platform", hint: "Product catalog, cart, checkout architecture, and storage" },
        { value: "ai", label: "AI Application", hint: "Vercel AI SDK, OpenAI/Claude streaming, storage, and chat UI" },
        { value: "ai-agent", label: "AI Agent & RAG Engine", hint: "Multi-model AI agent, document ingestion, vector storage" },
        { value: "supabase", label: "Supabase Fullstack", hint: "Supabase Auth, PostgreSQL, Realtime subscriptions, and Storage" },
        { value: "realtime", label: "Real-time Application", hint: "Server-Sent Events, presence/notifications, and Redis" },
        { value: "graphql-api", label: "GraphQL Microservice", hint: "GraphQL Yoga, schema codegen, Drizzle ORM, and Redis" },
        { value: "api", label: "API Starter (tRPC + OpenAPI)", hint: "tRPC, OpenAPI contracts, Docker, and health checks" },
        { value: "blog", label: "Blog & CMS", hint: "Tiptap rich text editor, content management tables, and uploads" },
        { value: "docs", label: "Documentation Portal", hint: "Developer documentation, search indexing, and queries" },
        { value: "design-system", label: "Design System & Workshop", hint: "Storybook component workshop, tokens, and animations" },
        { value: "pwa", label: "Progressive Web App (PWA)", hint: "Offline service worker caching, manifest, and persistent state" },
        { value: "portfolio", label: "Portfolio & Showcase", hint: "Smooth Framer Motion animations and custom tokens" },
        { value: "mobile-fullstack", label: "Mobile Companion Backend", hint: "Fullstack tRPC backend for React Native mobile" },
        { value: "custom", label: "Custom Architecture", hint: "Pick and choose individual plugins manually" },
      ],
    });
    bail(templateChoice);

    if (templateChoice !== "custom") {
      selectedTemplate = templateChoice;
      const tplResolution = resolveTemplate(templateChoice);
      preconfiguredPlugins = tplResolution.resolvedPlugins;
      defaultUiLibrary = tplResolution.uiLibrary;
    }
  }

  // 3. UI Library
  let uiLibrary = options.uiLibrary ?? defaultUiLibrary;
  if (!options.uiLibrary && !selectedTemplate && !selectedPreset && !isNonInteractive) {
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
    uiLibrary = uiLibraryInput;
  }

  // 4. Package Manager
  let packageManager = options.packageManager ?? "pnpm";
  if (!options.packageManager && !isNonInteractive) {
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
    packageManager = packageManagerInput;
  }

  // 5. Features / Plugins Selection
  const activeFeatures = new Set<FeatureKey>(preconfiguredPlugins);

  // CLI explicit ORM override
  if (options.orm) {
    const ormKey = resolveFeatureKey(options.orm);
    if (ormKey === "prisma") {
      activeFeatures.delete("drizzle");
      activeFeatures.add("prisma");
    } else if (ormKey === "drizzle") {
      activeFeatures.delete("prisma");
      activeFeatures.add("drizzle");
    }
  }

  // CLI explicit features override / add
  if (options.features?.length) {
    for (const f of options.features) {
      const resolved = resolveFeatureKey(f);
      if (resolved) {
        // If the explicitly requested feature conflicts with a template default,
        // prioritize the user's explicit selection
        const meta = PLUGIN_METADATA[resolved];
        if (meta?.conflicts) {
          for (const conflict of meta.conflicts) {
            activeFeatures.delete(conflict);
          }
        }
        activeFeatures.add(resolved);
      }
    }
  } else if (!selectedTemplate && !selectedPreset && !isNonInteractive) {
    const featureSelection = await p.multiselect<FeatureKey>({
      message: "Select additional features (space to toggle, enter to confirm)",
      required: false,
      options: FEATURE_OPTIONS,
    });
    bail(featureSelection);
    for (const f of featureSelection) activeFeatures.add(f);
  }

  // 6. Install Now & Git Init
  let installNow = options.installNow ?? false;
  let initGit = options.initGit ?? true;

  if (!isNonInteractive) {
    if (options.installNow === undefined) {
      const installNowInput = await p.confirm({
        message: "Install dependencies now?",
        initialValue: true,
      });
      bail(installNowInput);
      installNow = installNowInput;
    }

    if (options.initGit === undefined) {
      const initGitInput = await p.confirm({
        message: "Initialize a git repository?",
        initialValue: true,
      });
      bail(initGitInput);
      initGit = initGitInput;
    }
  }

  const pluginRegistry = getPluginRegistry();
  const pluginAnswers = !isNonInteractive
    ? await runPluginPrompts(Array.from(activeFeatures), pluginRegistry)
    : {};

  return {
    projectName,
    packageManager,
    uiLibrary,
    installNow,
    initGit,
    template: selectedTemplate,
    preset: selectedPreset,
    features: buildFeatureFlags(activeFeatures),
    pluginAnswers,
  };
}