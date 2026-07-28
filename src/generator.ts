import fs from "fs-extra";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildPackageJson } from "./packageManifest.js";
import type { Answers, FeatureFlags, FeatureKey, GenerateProjectOptions, UiLibrary } from "./types.js";
import { copyTemplateDir } from "./utils/copyTemplate.js";
import { devCommand, installCommand } from "./utils/pmCommands.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_ROOT = path.join(__dirname, "..", "templates");
const BASE_DIR = path.join(TEMPLATES_ROOT, "base");
const ADDONS_DIR = path.join(TEMPLATES_ROOT, "addons");
const UI_DIR = path.join(TEMPLATES_ROOT, "ui");

// Maps feature flags -> addon overlay folder name (skipped when false).
const ADDON_FOLDERS: Record<FeatureKey, string> = {
  prisma: "prisma",
  betterAuth: "better-auth",
  cypress: "cypress",
  docker: "docker",
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
};

export async function generateProject(answers: Answers, { onStep }: GenerateProjectOptions = {}) {
  const uiLibrary = answers.uiLibrary ?? "shadcn";
  const targetDir = path.resolve(process.cwd(), answers.projectName);

  if (await fs.pathExists(targetDir)) {
    const files = await fs.readdir(targetDir);
    if (files.length > 0) {
      throw new Error(`Directory "${answers.projectName}" already exists and is not empty.`);
    }
  }

  onStep?.("Copying base template");
  await copyTemplateDir(BASE_DIR, targetDir);

  onStep?.("Applying selected features");
  for (const [flag, folder] of Object.entries(ADDON_FOLDERS) as [FeatureKey, string][]) {
    if (!answers.features[flag]) continue;
    const addonDir = path.join(ADDONS_DIR, folder);
    if (await fs.pathExists(addonDir)) {
      await copyTemplateDir(addonDir, targetDir);
    }
  }

  if (uiLibrary !== "shadcn") {
    const uiDir = path.join(UI_DIR, uiLibrary);
    if (await fs.pathExists(uiDir)) {
      await copyTemplateDir(uiDir, targetDir);
    }
  }

  onStep?.("Writing package.json");
  const packageJson = buildPackageJson(answers);
  await fs.writeJson(path.join(targetDir, "package.json"), packageJson, { spaces: 2 });

  onStep?.("Patching configuration");
  await patchNextConfig(targetDir, answers.features);
  await patchAppProviders(targetDir, answers.features, uiLibrary);
  await patchReadme(targetDir, answers);
  await patchLintStaged(targetDir, answers.features);

  return { targetDir };
}

async function patchNextConfig(targetDir: string, features: FeatureFlags) {
  const configPath = path.join(targetDir, "next.config.mjs");
  let content = await fs.readFile(configPath, "utf8");

  if (features.docker) {
    content = content.replace(
      "// __OUTPUT_STANDALONE__",
      'output: "standalone",',
    );
  } else {
    content = content.replace("// __OUTPUT_STANDALONE__\n", "");
  }

  if (features.bundleAnalyzer) {
    content = content.replace(
      'import createNextIntlPlugin from "next-intl/plugin";',
      'import createNextIntlPlugin from "next-intl/plugin";\nimport bundleAnalyzer from "@next/bundle-analyzer";',
    );
    content = content.replace(
      "// __BUNDLE_ANALYZER__",
      'const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });\nnextConfig = withBundleAnalyzer(nextConfig);',
    );
  } else {
    content = content.replace("// __BUNDLE_ANALYZER__\n", "");
  }

  if (features.pwa) {
    content = content.replace(
      'import createNextIntlPlugin from "next-intl/plugin";',
      'import createNextIntlPlugin from "next-intl/plugin";\nimport withPWAInit from "next-pwa";',
    );
    content = content.replace(
      "export default withNextIntl(nextConfig);",
      'const withPWA = withPWAInit({ dest: "public", disable: process.env.NODE_ENV === "development" });\n\nexport default withPWA(withNextIntl(nextConfig));',
    );
  }

  if (features.sentry) {
    content = content.replace(
      'import createNextIntlPlugin from "next-intl/plugin";',
      'import createNextIntlPlugin from "next-intl/plugin";\nimport { withSentryConfig } from "@sentry/nextjs";',
    );
    content = content.replace(
      /export default (.+);/,
      'export default withSentryConfig($1, {\n  silent: true,\n  org: process.env.SENTRY_ORG,\n  project: process.env.SENTRY_PROJECT,\n});',
    );
  }

  await fs.writeFile(configPath, content, "utf8");
}

async function patchAppProviders(targetDir: string, features: FeatureFlags, uiLibrary: UiLibrary) {
  const providersPath = path.join(targetDir, "src", "providers", "app-providers.tsx");
  let content = await fs.readFile(providersPath, "utf8");

  const imports: string[] = [];
  const wrappers: Array<{ open: string; close: string }> = [];

  if (uiLibrary === "mui") {
    imports.push('import { MuiProvider } from "@/providers/mui-provider";');
    wrappers.push({ open: "<MuiProvider>", close: "</MuiProvider>" });
  }

  if (uiLibrary === "chakra") {
    imports.push('import { ChakraAppProvider } from "@/providers/chakra-provider";');
    wrappers.push({ open: "<ChakraAppProvider>", close: "</ChakraAppProvider>" });
  }

  if (features.tanstackQuery) {
    imports.push('import { QueryProvider } from "@/providers/query-provider";');
    wrappers.push({ open: "<QueryProvider>", close: "</QueryProvider>" });
  }

  if (!imports.length) return;

  content = content.replace(
    'import { ThemeProvider } from "@/components/providers/theme-provider";',
    `import { ThemeProvider } from "@/components/providers/theme-provider";\n${imports.join("\n")}`,
  );

  content = content.replace(
    "<ThemeProvider disableTransitionOnChange>\n      {children}\n    </ThemeProvider>",
    `<ThemeProvider disableTransitionOnChange>\n${renderProviderTree(wrappers, 3)}\n    </ThemeProvider>`,
  );

  await fs.writeFile(providersPath, content, "utf8");
}

function renderProviderTree(wrappers: Array<{ open: string; close: string }>, depth: number): string {
  const indent = "  ".repeat(depth);

  if (!wrappers.length) {
    return `${indent}{children}`;
  }

  const [wrapper, ...rest] = wrappers;
  return [
    `${indent}${wrapper.open}`,
    renderProviderTree(rest, depth + 1),
    `${indent}${wrapper.close}`,
  ].join("\n");
}

async function patchLintStaged(targetDir: string, features: FeatureFlags) {
  if (!features.husky) return;

  const pkgPath = path.join(targetDir, "package.json");
  const pkg = await fs.readJson(pkgPath);
  pkg["lint-staged"] = {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"],
  };
  await fs.writeJson(pkgPath, pkg, { spaces: 2 });
}

async function patchReadme(targetDir: string, answers: Answers) {
  const readmePath = path.join(targetDir, "README.md");
  let content = await fs.readFile(readmePath, "utf8");

  const featureLabels: Record<FeatureKey, string> = {
    prisma: "Prisma ORM",
    betterAuth: "Better Auth",
    tanstackQuery: "TanStack Query",
    cypress: "Cypress (E2E)",
    vitest: "Vitest (unit tests)",
    storybook: "Storybook",
    docker: "Docker (multi-stage build)",
    husky: "Husky + lint-staged",
    pwa: "PWA support",
    bundleAnalyzer: "Bundle Analyzer",
    zustand: "Zustand client state",
    msw: "MSW API mocking",
    reactEmail: "React Email templates",
    playwright: "Playwright E2E tests",
    sentry: "Sentry monitoring",
    openapi: "OpenAPI typed client generation",
  };

  const scriptHints: Partial<Record<FeatureKey, string>> = {
    prisma: "| `db:generate` / `db:migrate` / `db:studio` / `db:seed` | Prisma |",
    cypress: "| `cy:open` / `cy:run` | Cypress |",
    vitest: "| `test` / `test:watch` | Vitest |",
    storybook: "| `storybook` / `build-storybook` | Storybook |",
    bundleAnalyzer: "| `analyze` | Bundle analyzer build |",
    msw: "| `mock:api` | Initialize the MSW browser worker |",
    reactEmail: "| `email:dev` | Preview React Email templates |",
    playwright: "| `pw:test` / `pw:ui` / `pw:install` | Playwright E2E tests |",
    openapi: "| `api:types` | Generate TypeScript types from OpenAPI |",
  };

  const featureLines = (Object.entries(answers.features) as [FeatureKey, boolean][])
    .filter(([, enabled]) => enabled)
    .map(([key]) => `- ${featureLabels[key]}`)
    .join("\n");

  const scriptLines = (Object.entries(answers.features) as [FeatureKey, boolean][])
    .filter(([key, enabled]) => enabled && scriptHints[key])
    .map(([key]) => scriptHints[key])
    .join("\n");

  content = content
    .replaceAll("__PROJECT_NAME__", answers.projectName)
    .replace("__INSTALL_CMD__", installCommand(answers.packageManager))
    .replace("__DEV_CMD__", devCommand(answers.packageManager))
    .replace("__UI_LIBRARY__", uiLibraryLabel(answers.uiLibrary ?? "shadcn"))
    .replace("__FEATURE_LINES__", featureLines)
    .replace("__FEATURE_SCRIPT_LINES__", scriptLines);

  await fs.writeFile(readmePath, content, "utf8");
}

function uiLibraryLabel(uiLibrary: UiLibrary) {
  switch (uiLibrary) {
    case "mui":
      return "Material UI";
    case "chakra":
      return "Chakra UI";
    case "shadcn":
    default:
      return "shadcn-style primitives";
  }
}
