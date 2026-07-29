import { copyTemplateDir, devCommand, installCommand } from "@nova/core";
import fs from "fs-extra";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildPackageJson } from "./packageManifest.js";
import type { Answers, FeatureFlags, FeatureKey, GenerateProjectOptions, UiLibrary } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_ROOT = path.join(__dirname, "..", "templates");
const BASE_DIR = path.join(TEMPLATES_ROOT, "base");
const ADDONS_DIR = path.join(TEMPLATES_ROOT, "addons");
const UI_DIR = path.join(TEMPLATES_ROOT, "ui");

// Maps feature flags -> addon overlay folder name (skipped when false).
// NOTE: this is the informal "plugin registry" that Phase 4 (plugin loader)
// replaces with a real registry populated by plugins registering themselves,
// so new features stop requiring an edit here.
const ADDON_FOLDERS: Record<FeatureKey, string> = {
  prisma: "prisma",
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

  if (answers.features.storybook) {
    onStep?.("Patching Storybook preview");
    await writeStorybookPreview(targetDir, uiLibrary, answers.features);
  }

  // Auto-patch Tailwind to enable DaisyUI when the Daisy UI library is selected
  if (uiLibrary === "daisy") {
    onStep?.("Patching Tailwind config for DaisyUI");
    await writeTailwindForDaisy(targetDir);
  }

  await patchReadme(targetDir, answers);
  await patchLintStaged(targetDir, answers.features);

  // Docker Compose generation (runtime-driven) — write docker-compose.yml
  if (answers.features.dockerCompose) {
    onStep?.("Generating docker-compose.yml");
    await generateDockerCompose(targetDir, answers.features);
  }

  // Patch middleware to add security headers if the feature is enabled
  if (answers.features.securityHeaders) {
    onStep?.("Patching middleware for security headers");
    await patchMiddlewareForSecurityHeaders(targetDir);
  }

  return { targetDir };
}

async function writeStorybookPreview(targetDir: string, uiLibrary: UiLibrary, features: FeatureFlags) {
  const sbDir = path.join(targetDir, ".storybook");
  await fs.ensureDir(sbDir);
  const previewPath = path.join(sbDir, "preview.ts");

  // Default preview content — imports global styles and sets basic parameters
  let content = `import type { Preview } from "@storybook/react";

import "../src/styles/globals.css";

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export default preview;
`;

  // Provider-aware decorators per UI library override
  if (uiLibrary === "ant") {
    content = `import type { Preview } from "@storybook/react";
import "../src/styles/globals.css";
import React from "react";
import { AntProvider } from "../src/providers/ant-provider";

export const decorators = [
  (Story) => (
    <AntProvider>
      <Story />
    </AntProvider>
  ),
];

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export default preview;
`;
  } else if (uiLibrary === "mantine") {
    content = `import type { Preview } from "@storybook/react";
import "../src/styles/globals.css";
import React from "react";
import { MantineProvider } from "../src/providers/mantine-provider";

export const decorators = [
  (Story) => (
    <MantineProvider>
      <Story />
    </MantineProvider>
  ),
];

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export default preview;
`;
  } else if (uiLibrary === "hero") {
    content = `import type { Preview } from "@storybook/react";
import "../src/styles/globals.css";
import React from "react";
import { HeroProvider } from "../src/providers/nextui-provider";

export const decorators = [
  (Story) => (
    <HeroProvider>
      <Story />
    </HeroProvider>
  ),
];

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export default preview;
`;
  } else if (uiLibrary === "chakra") {
    content = `import type { Preview } from "@storybook/react";
import "../src/styles/globals.css";
import React from "react";
import { ChakraAppProvider } from "../src/providers/chakra-provider";

export const decorators = [
  (Story) => (
    <ChakraAppProvider>
      <Story />
    </ChakraAppProvider>
  ),
];

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export default preview;
`;
  } else if (uiLibrary === "mui") {
    content = `import type { Preview } from "@storybook/react";
import "../src/styles/globals.css";
import React from "react";
import { MuiProvider } from "../src/providers/mui-provider";

export const decorators = [
  (Story) => (
    <MuiProvider>
      <Story />
    </MuiProvider>
  ),
];

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export default preview;
`;
  }

  // If MSW is enabled in features, initialize and include the MSW decorator
  if (features.msw) {
    content = `import { initialize, mswDecorator } from "msw-storybook-addon";\n${content}\ninitialize();\n\nexport const decorators = [mswDecorator].concat((typeof decorators !== 'undefined') ? decorators : []);`;
  }

  await fs.writeFile(previewPath, content, "utf8");
}


async function generateDockerCompose(targetDir: string, features: FeatureFlags) {
  const services: string[] = [];

  // app service (uses local Dockerfile if present)
  services.push(`  app:\n    build: .\n    ports:\n      - \"3000:3000\"\n    environment:\n      - NODE_ENV=development\n    depends_on:\n      - mailpit\n`);

  if (features.prisma) {
    services.push(`  postgres:\n    image: postgres:15\n    environment:\n      - POSTGRES_PASSWORD=postgres\n    ports:\n      - \"5432:5432\"\n    volumes:\n      - pgdata:/var/lib/postgresql/data\n`);
  }

  if (features.redis) {
    services.push(`  redis:\n    image: redis:7.2-alpine\n    ports:\n      - \"6379:6379\"\n`);
  }

  if (features.mailpit) {
    services.push(`  mailpit:\n    image: axllent/mailpit:latest\n    ports:\n      - \"8025:8025\"\n      - \"1025:1025\"\n`);
  }

  const volumes = features.prisma ? `\nvolumes:\n  pgdata:` : "";

  const compose = `version: '3.8'\nservices:\n${services.join("\n")}${volumes}\n`;

  await fs.writeFile(path.join(targetDir, "docker-compose.yml"), compose, "utf8");
}

async function patchMiddlewareForSecurityHeaders(targetDir: string) {
  const middlewarePath = path.join(targetDir, "src", "middleware.ts");
  if (!(await fs.pathExists(middlewarePath))) return;
  let content = await fs.readFile(middlewarePath, "utf8");

  // Idempotent: add import and wrapper only if not present
  if (!content.includes("@/lib/security-headers")) {
    content = content.replace(
      "import createMiddleware from \"next-intl/middleware\";",
      "import createMiddleware from \"next-intl/middleware\";\nimport { applySecurityHeaders } from \"@/lib/security-headers\";",
    );

    // Wrap the default export function
    content = content.replace(
      "export default createMiddleware(routing);",
      `const __nova_next_middleware = createMiddleware(routing);

export default async function middleware(request) {
  const response = await __nova_next_middleware(request);
  try { applySecurityHeaders(response); } catch (e) { /* noop */ }
  return response;
}`,
    );

    await fs.writeFile(middlewarePath, content, "utf8");
  }
}

async function writeTailwindForDaisy(targetDir: string) {
  const tailwindPath = path.join(targetDir, "tailwind.config.ts");
  if (!(await fs.pathExists(tailwindPath))) return;
  let content = await fs.readFile(tailwindPath, "utf8");

  // Add daisyui import if missing
  if (!content.includes("from 'daisyui'") && !content.includes("from \"daisyui\"")) {
    content = content.replace(/(import type \{ Config \} from \"tailwindcss\";\n\n)/, `$1import daisyui from 'daisyui';\n\n`);
  }

  // Add daisyui plugin into plugins array
  if (!content.includes("daisyui")) {
    content = content.replace(/plugins: \[\],/, "plugins: [daisyui],");
  }

  // Add basic daisyui config if not present
  if (!content.includes("daisyui:")) {
    content = content.replace(/export default config;/, `config.daisyui = { themes: ['light', 'dark'] };\n\nexport default config;`);
  }

  await fs.writeFile(tailwindPath, content, "utf8");
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
    dockerCompose: "Docker Compose (dev services)",
    husky: "Husky + lint-staged",
    pwa: "PWA support",
    bundleAnalyzer: "Bundle Analyzer",
    zustand: "Zustand client state",
    msw: "MSW API mocking",
    reactEmail: "React Email templates",
    playwright: "Playwright E2E tests",
    sentry: "Sentry monitoring",
    openapi: "OpenAPI typed client generation",
    redis: "Redis client",
    mailpit: "Mailpit (local email)",
    health: "Health & readiness endpoints",
    securityHeaders: "Security headers middleware",
    designSystem: "Design system & tokens",
    strapi: "Strapi CMS integration",
    animations: "Framer Motion animations",
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
    case "ant":
      return "Ant Design";
    case "mantine":
      return "Mantine";
    case "hero":
      return "NextUI / HeroUI";
    case "daisy":
      return "DaisyUI (Tailwind)";
    case "headless":
      return "Headless UI";
    case "shadcn":
    default:
      return "shadcn-style primitives";
  }
}
