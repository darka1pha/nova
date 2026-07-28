import { bail, type PackageManager } from "@nova/core";
import * as p from "@clack/prompts";
import pc from "picocolors";

import type { Answers, FeatureKey, UiLibrary } from "./types.js";

// Shared with src/index.ts validation for CLI-argument project names so
// the interactive prompt and the `nova-create <name>` argument path enforce
// the exact same rule. Deliberately excludes "." and "/" so a project name
// can never resolve outside the target directory in generator.ts.
const PROJECT_NAME_PATTERN = /^[a-z0-9-_]+$/i;

export function isValidProjectName(name: string): boolean {
  return PROJECT_NAME_PATTERN.test(name);
}

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
    ],
  });
  bail(uiLibraryInput);
  const uiLibrary = uiLibraryInput;

  const features = await p.multiselect<FeatureKey>({
    message: "Select additional features (space to toggle, enter to confirm)",
    required: false,
    options: [
      { value: "prisma", label: "Prisma ORM", hint: "PostgreSQL-ready schema + client singleton" },
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
      { value: "playwright", label: "Playwright", hint: "Modern cross-browser E2E tests" },
      { value: "sentry", label: "Sentry", hint: "Error monitoring and tracing hooks" },
      { value: "openapi", label: "OpenAPI typed client", hint: "Generate types from backend contracts" },
    ],
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

  return {
    projectName,
    packageManager,
    uiLibrary,
    installNow: Boolean(installNow),
    initGit: Boolean(initGit),
    features: {
      prisma: featureSet.has("prisma"),
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
    },
  };
}