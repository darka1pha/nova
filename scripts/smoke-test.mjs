import fs from "fs-extra";
import os from "node:os";
import path from "node:path";

import { generateProject } from "../dist/generator.js";

const tmpRoot = os.tmpdir();
process.chdir(tmpRoot);

const fullAnswers = {
  projectName: "smoke-full",
  packageManager: "pnpm",
  uiLibrary: "mui",
  installNow: false,
  initGit: false,
  features: {
    prisma: true,
    betterAuth: true,
    tanstackQuery: true,
    cypress: true,
    vitest: true,
    storybook: true,
    docker: true,
    husky: true,
    pwa: true,
    bundleAnalyzer: true,
    zustand: true,
    msw: true,
    reactEmail: true,
    playwright: true,
    sentry: true,
    openapi: true,
  },
};

await fs.remove(path.join(tmpRoot, fullAnswers.projectName));
const result = await generateProject(fullAnswers, { onStep: (s) => console.log("step:", s) });
console.log("Generated at", result.targetDir);

// Minimal file-tree sanity checks
const mustExist = [
  "package.json",
  "next.config.mjs",
  "src/app/[locale]/layout.tsx",
  "src/lib/api/client.ts",
  "src/lib/auth/refresh.ts",
  "prisma/schema.prisma",
  "src/lib/prisma/client.ts",
  "src/lib/auth/better-auth.ts",
  "src/providers/query-provider.tsx",
  "cypress.config.ts",
  "cypress/e2e/auth.cy.ts",
  "vitest.config.ts",
  ".storybook/main.ts",
  "Dockerfile",
  ".husky/pre-commit",
  "public/manifest.json",
  "src/stores/preferences-store.ts",
  "src/mocks/handlers.ts",
  "src/emails/welcome-email.tsx",
  "src/lib/email/render.tsx",
  "src/providers/mui-provider.tsx",
  "src/components/examples/mui-action-panel.tsx",
  "docs/ui-library.md",
  "docs/zustand.md",
  "docs/msw.md",
  "docs/email.md",
  "playwright.config.ts",
  "tests/e2e/home.spec.ts",
  "docs/playwright.md",
  "sentry.client.config.ts",
  "sentry.server.config.ts",
  "sentry.edge.config.ts",
  "src/lib/observability/sentry.ts",
  "docs/sentry.md",
  "openapi/schema.yaml",
  "src/lib/api/openapi-client.ts",
  "src/lib/api/schema.d.ts",
  "src/services/openapi-user-service.ts",
  "docs/openapi.md",
  "docs/folder-structure.md",
  "README.md",
];

let missing = [];
for (const rel of mustExist) {
  const exists = await fs.pathExists(path.join(result.targetDir, rel));
  if (!exists) missing.push(rel);
}

if (missing.length) {
  console.error("MISSING FILES:", missing);
  process.exit(1);
}

const pkg = await fs.readJson(path.join(result.targetDir, "package.json"));
console.log("scripts:", Object.keys(pkg.scripts));
console.log("lint-staged present:", Boolean(pkg["lint-staged"]));

const nextConfig = await fs.readFile(path.join(result.targetDir, "next.config.mjs"), "utf8");
console.log("--- next.config.mjs ---");
console.log(nextConfig);

const providers = await fs.readFile(path.join(result.targetDir, "src/providers/app-providers.tsx"), "utf8");
console.log("--- app-providers.tsx ---");
console.log(providers);

const chakraAnswers = {
  ...fullAnswers,
  projectName: "smoke-chakra",
  uiLibrary: "chakra",
  features: {
    ...fullAnswers.features,
    tanstackQuery: false,
    prisma: false,
    betterAuth: false,
    cypress: false,
    vitest: false,
    storybook: false,
    docker: false,
    husky: false,
    pwa: false,
    bundleAnalyzer: false,
    zustand: false,
    msw: false,
    reactEmail: false,
    playwright: false,
    sentry: false,
    openapi: false,
  },
};

await fs.remove(path.join(tmpRoot, chakraAnswers.projectName));
const chakraResult = await generateProject(chakraAnswers, { onStep: (s) => console.log("chakra step:", s) });
const chakraMustExist = [
  "src/providers/chakra-provider.tsx",
  "src/components/examples/chakra-action-panel.tsx",
  "docs/ui-library.md",
];

missing = [];
for (const rel of chakraMustExist) {
  const exists = await fs.pathExists(path.join(chakraResult.targetDir, rel));
  if (!exists) missing.push(rel);
}

if (missing.length) {
  console.error("MISSING CHAKRA FILES:", missing);
  process.exit(1);
}

const chakraProviders = await fs.readFile(path.join(chakraResult.targetDir, "src/providers/app-providers.tsx"), "utf8");
console.log("--- chakra app-providers.tsx ---");
console.log(chakraProviders);

// ANT UI test
const antAnswers = {
  ...fullAnswers,
  projectName: "smoke-ant",
  uiLibrary: "ant",
  features: {
    prisma: false,
    betterAuth: false,
    tanstackQuery: false,
    cypress: false,
    vitest: false,
    storybook: false,
    docker: false,
    husky: false,
    pwa: false,
    bundleAnalyzer: false,
    zustand: false,
    msw: false,
    reactEmail: false,
    playwright: false,
    sentry: false,
    openapi: false,
    redis: false,
    mailpit: false,
    dockerCompose: false,
    health: false,
    securityHeaders: false,
  },
};

await fs.remove(path.join(tmpRoot, antAnswers.projectName));
const antResult = await generateProject(antAnswers, { onStep: (s) => console.log("ant step:", s) });
const antMustExist = [
  "src/providers/ant-provider.tsx",
  "docs/ui-library.md",
];

missing = [];
for (const rel of antMustExist) {
  const exists = await fs.pathExists(path.join(antResult.targetDir, rel));
  if (!exists) missing.push(rel);
}

if (missing.length) {
  console.error("MISSING ANT FILES:", missing);
  process.exit(1);
}

// Mantine UI test
const mantineAnswers = {
  ...fullAnswers,
  projectName: "smoke-mantine",
  uiLibrary: "mantine",
  features: {
    prisma: false,
    betterAuth: false,
    tanstackQuery: false,
    cypress: false,
    vitest: false,
    storybook: false,
    docker: false,
    husky: false,
    pwa: false,
    bundleAnalyzer: false,
    zustand: false,
    msw: false,
    reactEmail: false,
    playwright: false,
    sentry: false,
    openapi: false,
    redis: false,
    mailpit: false,
    dockerCompose: false,
    health: false,
    securityHeaders: false,
  },
};

await fs.remove(path.join(tmpRoot, mantineAnswers.projectName));
const mantineResult = await generateProject(mantineAnswers, { onStep: (s) => console.log("mantine step:", s) });
const mantineMustExist = [
  "src/providers/mantine-provider.tsx",
  "docs/ui-library.md",
];

missing = [];
for (const rel of mantineMustExist) {
  const exists = await fs.pathExists(path.join(mantineResult.targetDir, rel));
  if (!exists) missing.push(rel);
}

if (missing.length) {
  console.error("MISSING MANTINE FILES:", missing);
  process.exit(1);
}

// NextUI / Hero UI test
const nextuiAnswers = {
  ...fullAnswers,
  projectName: "smoke-nextui",
  uiLibrary: "hero",
  features: {
    prisma: false,
    betterAuth: false,
    tanstackQuery: false,
    cypress: false,
    vitest: false,
    storybook: false,
    docker: false,
    husky: false,
    pwa: false,
    bundleAnalyzer: false,
    zustand: false,
    msw: false,
    reactEmail: false,
    playwright: false,
    sentry: false,
    openapi: false,
    redis: false,
    mailpit: false,
    dockerCompose: false,
    health: false,
    securityHeaders: false,
  },
};

await fs.remove(path.join(tmpRoot, nextuiAnswers.projectName));
const nextuiResult = await generateProject(nextuiAnswers, { onStep: (s) => console.log("nextui step:", s) });
const nextuiMustExist = [
  "src/providers/nextui-provider.tsx",
  "docs/ui-library.md",
];

missing = [];
for (const rel of nextuiMustExist) {
  const exists = await fs.pathExists(path.join(nextuiResult.targetDir, rel));
  if (!exists) missing.push(rel);
}

if (missing.length) {
  console.error("MISSING NEXTUI FILES:", missing);
  process.exit(1);
}

// Infra plugins test (redis, mailpit, health, security headers, docker-compose)
const infraAnswers = {
  ...fullAnswers,
  projectName: "smoke-infra",
  uiLibrary: "shadcn",
  features: {
    prisma: false,
    betterAuth: false,
    tanstackQuery: false,
    cypress: false,
    vitest: false,
    storybook: false,
    docker: false,
    husky: false,
    pwa: false,
    bundleAnalyzer: false,
    zustand: false,
    msw: false,
    reactEmail: false,
    playwright: false,
    sentry: false,
    openapi: false,
    redis: true,
    mailpit: true,
    dockerCompose: true,
    health: true,
    securityHeaders: true,
  },
};

await fs.remove(path.join(tmpRoot, infraAnswers.projectName));
const infraResult = await generateProject(infraAnswers, { onStep: (s) => console.log("infra step:", s) });
const infraMustExist = [
  "src/lib/redis/client.ts",
  "src/lib/email/mailpit.ts",
  "src/app/api/ready/route.ts",
  "src/lib/security-headers.ts",
  "docker-compose.yml",
];

missing = [];
for (const rel of infraMustExist) {
  const exists = await fs.pathExists(path.join(infraResult.targetDir, rel));
  if (!exists) missing.push(rel);
}

if (missing.length) {
  console.error("MISSING INFRA FILES:", missing);
  process.exit(1);
}

console.log("SMOKE TEST OK");
