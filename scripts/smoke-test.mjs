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

console.log("SMOKE TEST OK");
