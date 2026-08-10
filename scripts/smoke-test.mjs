import fs from "fs-extra";
import os from "node:os";
import path from "node:path";

import { generateProject, generateMobileProject } from "../dist/generator.js";


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

const novaConfig = await fs.readJson(path.join(result.targetDir, ".nova.json"));
if (novaConfig.packageManager !== fullAnswers.packageManager || !novaConfig.plugins.includes("prisma")) {
  console.error("INVALID NOVA PROJECT METADATA", novaConfig);
  process.exit(1);
}

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

// Drizzle ORM plugin test
const drizzleAnswers = {
  ...fullAnswers,
  projectName: "smoke-drizzle",
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
    redis: false,
    mailpit: false,
    dockerCompose: false,
    health: false,
    securityHeaders: false,
    drizzle: true,
  },
};

await fs.remove(path.join(tmpRoot, drizzleAnswers.projectName));
const drizzleResult = await generateProject(drizzleAnswers, { onStep: (s) => console.log("drizzle step:", s) });
const drizzleMustExist = [
  "drizzle.config.ts",
  "src/lib/db/schema.ts",
  "src/lib/db/client.ts",
  "docs/drizzle.md",
];

missing = [];
for (const rel of drizzleMustExist) {
  const exists = await fs.pathExists(path.join(drizzleResult.targetDir, rel));
  if (!exists) missing.push(rel);
}

if (missing.length) {
  console.error("MISSING DRIZZLE FILES:", missing);
  process.exit(1);
}

const drizzlePkg = await fs.readJson(path.join(drizzleResult.targetDir, "package.json"));
const drizzleScripts = ["db:generate", "db:migrate", "db:push", "db:studio"];
const missingScripts = drizzleScripts.filter((s) => !drizzlePkg.scripts?.[s]);
if (missingScripts.length) {
  console.error("MISSING DRIZZLE SCRIPTS:", missingScripts);
  process.exit(1);
}
if (!drizzlePkg.dependencies?.["drizzle-orm"]) {
  console.error("MISSING drizzle-orm DEPENDENCY");
  process.exit(1);
}

const drizzleNovaConfig = await fs.readJson(path.join(drizzleResult.targetDir, ".nova.json"));
if (!drizzleNovaConfig.plugins.includes("drizzle")) {
  console.error("DRIZZLE NOT TRACKED IN .nova.json", drizzleNovaConfig);
  process.exit(1);
}

// Drizzle <-> Prisma conflict test - must fail generation before writing files
const conflictAnswers = {
  ...drizzleAnswers,
  projectName: "smoke-drizzle-prisma-conflict",
  features: {
    ...drizzleAnswers.features,
    prisma: true,
    drizzle: true,
  },
};

await fs.remove(path.join(tmpRoot, conflictAnswers.projectName));
let conflictThrew = false;
try {
  await generateProject(conflictAnswers, { onStep: () => {} });
} catch (error) {
  conflictThrew = true;
  console.log("Expected Drizzle/Prisma conflict error:", error instanceof Error ? error.message : error);
}
if (!conflictThrew) {
  console.error("EXPECTED Prisma/Drizzle conflict error, but generation succeeded");
  process.exit(1);
}
const conflictDirExists = await fs.pathExists(path.join(tmpRoot, conflictAnswers.projectName));
if (conflictDirExists) {
  console.error("Conflict generation should not have left a project directory on disk");
  process.exit(1);
}

// tRPC plugin test
const trpcAnswers = {
  ...fullAnswers,
  projectName: "smoke-trpc",
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
    redis: false,
    mailpit: false,
    dockerCompose: false,
    health: false,
    securityHeaders: false,
    designSystem: false,
    strapi: false,
    animations: false,
    tanstackTable: false,
    recharts: false,
    tiptap: false,
    drizzle: false,
    trpc: true,
  },
};

await fs.remove(path.join(tmpRoot, trpcAnswers.projectName));
const trpcResult = await generateProject(trpcAnswers, { onStep: (s) => console.log("trpc step:", s) });
const trpcMustExist = [
  "src/lib/trpc/server.ts",
  "src/lib/trpc/root.ts",
  "src/lib/trpc/routers/example.ts",
  "src/lib/trpc/client.ts",
  "src/lib/trpc/provider.tsx",
  "src/app/api/trpc/[trpc]/route.ts",
  "src/components/examples/trpc-action-panel.tsx",
  "docs/trpc.md",
];

missing = [];
for (const rel of trpcMustExist) {
  const exists = await fs.pathExists(path.join(trpcResult.targetDir, rel));
  if (!exists) missing.push(rel);
}

if (missing.length) {
  console.error("MISSING TRPC FILES:", missing);
  process.exit(1);
}

const trpcPkg = await fs.readJson(path.join(trpcResult.targetDir, "package.json"));
if (!trpcPkg.dependencies?.["@trpc/server"] || !trpcPkg.dependencies?.["@trpc/client"]) {
  console.error("MISSING tRPC DEPENDENCY");
  process.exit(1);
}

const trpcProviders = await fs.readFile(path.join(trpcResult.targetDir, "src/providers/app-providers.tsx"), "utf8");
if (!trpcProviders.includes("TRPCProvider")) {
  console.error("TRPCProvider NOT PATCHED IN app-providers.tsx");
  process.exit(1);
}

// GraphQL plugin test
const graphqlAnswers = {
  ...fullAnswers,
  projectName: "smoke-graphql",
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
    redis: false,
    mailpit: false,
    dockerCompose: false,
    health: false,
    securityHeaders: false,
    designSystem: false,
    strapi: false,
    animations: false,
    tanstackTable: false,
    recharts: false,
    tiptap: false,
    drizzle: false,
    trpc: false,
    graphql: true,
  },
};

await fs.remove(path.join(tmpRoot, graphqlAnswers.projectName));
const graphqlResult = await generateProject(graphqlAnswers, { onStep: (s) => console.log("graphql step:", s) });
const graphqlMustExist = [
  "codegen.ts",
  "src/app/api/graphql/route.ts",
  "src/lib/graphql/schema.ts",
  "src/lib/graphql/client.ts",
  "src/lib/graphql/queries/example.graphql",
  "src/components/examples/graphql-action-panel.tsx",
  "docs/graphql.md",
];

missing = [];
for (const rel of graphqlMustExist) {
  const exists = await fs.pathExists(path.join(graphqlResult.targetDir, rel));
  if (!exists) missing.push(rel);
}

if (missing.length) {
  console.error("MISSING GRAPHQL FILES:", missing);
  process.exit(1);
}

const graphqlPkg = await fs.readJson(path.join(graphqlResult.targetDir, "package.json"));
if (!graphqlPkg.dependencies?.["graphql-yoga"] || !graphqlPkg.scripts?.["codegen"]) {
  console.error("MISSING GRAPHQL DEPENDENCY OR SCRIPT");
  process.exit(1);
}

// Supabase plugin test
const supabaseAnswers = {
  ...fullAnswers,
  projectName: "smoke-supabase",
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
    redis: false,
    mailpit: false,
    dockerCompose: false,
    health: false,
    securityHeaders: false,
    designSystem: false,
    strapi: false,
    animations: false,
    tanstackTable: false,
    recharts: false,
    tiptap: false,
    drizzle: false,
    trpc: false,
    graphql: false,
    supabase: true,
  },
};

await fs.remove(path.join(tmpRoot, supabaseAnswers.projectName));
const supabaseResult = await generateProject(supabaseAnswers, { onStep: (s) => console.log("supabase step:", s) });
const supabaseMustExist = [
  "src/lib/supabase/client.ts",
  "src/lib/supabase/server.ts",
  "src/lib/supabase/middleware.ts",
  "src/lib/supabase/types.ts",
  "src/components/examples/supabase-auth-panel.tsx",
  "docs/supabase.md",
];

missing = [];
for (const rel of supabaseMustExist) {
  const exists = await fs.pathExists(path.join(supabaseResult.targetDir, rel));
  if (!exists) missing.push(rel);
}

if (missing.length) {
  console.error("MISSING SUPABASE FILES:", missing);
  process.exit(1);
}

const supabasePkg = await fs.readJson(path.join(supabaseResult.targetDir, "package.json"));
if (!supabasePkg.dependencies?.["@supabase/supabase-js"] || !supabasePkg.dependencies?.["@supabase/ssr"]) {
  console.error("MISSING SUPABASE DEPENDENCY");
  process.exit(1);
}

const supabaseEnv = await fs.readFile(path.join(supabaseResult.targetDir, ".env.example"), "utf8");
if (!supabaseEnv.includes("NEXT_PUBLIC_SUPABASE_URL") || !supabaseEnv.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
  console.error("SUPABASE ENV VARS NOT IN .env.example");
  process.exit(1);
}

// React Native Mobile template test
const mobileAnswers = {
  projectName: "smoke-mobile",
  projectType: "react-native",
  packageManager: "npm",
  uiLibrary: "headless",
  installNow: false,
  initGit: false,
  features: {},
};

await fs.remove(path.join(tmpRoot, mobileAnswers.projectName));
const mobileResult = await generateMobileProject(mobileAnswers, { onStep: (s) => console.log("mobile step:", s) });
const mobileMustExist = [
  "package.json",
  "app.json",
  "App.tsx",
  "index.js",
  "tsconfig.json",
  "src/theme/colors.ts",
  "src/theme/typography.ts",
  "src/components/Card.tsx",
  "src/components/Button.tsx",
  "src/services/api.ts",
  ".env.example",
  ".gitignore",
  "README.md",
  "docs/mobile.md",
];

missing = [];
for (const rel of mobileMustExist) {
  const exists = await fs.pathExists(path.join(mobileResult.targetDir, rel));
  if (!exists) missing.push(rel);
}

if (missing.length) {
  console.error("MISSING MOBILE FILES:", missing);
  process.exit(1);
}

const mobilePkg = await fs.readJson(path.join(mobileResult.targetDir, "package.json"));
if (!mobilePkg.dependencies?.["expo"] || !mobilePkg.dependencies?.["react-native"]) {
  console.error("MISSING MOBILE DEPENDENCIES");
  process.exit(1);
}

const mobileConfig = await fs.readJson(path.join(mobileResult.targetDir, ".nova.json"));
// AI Ecosystem plugin test (ai, openai)
const aiAnswers = {
  ...fullAnswers,
  projectName: "smoke-ai",
  uiLibrary: "shadcn",
  template: "ai",
  preset: "ai",
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
    zustand: true,
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
    designSystem: false,
    strapi: false,
    animations: false,
    tanstackTable: false,
    recharts: false,
    tiptap: false,
    drizzle: false,
    trpc: false,
    graphql: false,
    supabase: false,
    ai: true,
    openai: true,
  },
};

await fs.remove(path.join(tmpRoot, aiAnswers.projectName));
const aiResult = await generateProject(aiAnswers, { onStep: (s) => console.log("ai step:", s) });
const aiMustExist = [
  "src/app/api/chat/route.ts",
  "src/components/ai/chat.tsx",
  "docs/ai.md",
];

missing = [];
for (const rel of aiMustExist) {
  const exists = await fs.pathExists(path.join(aiResult.targetDir, rel));
  if (!exists) missing.push(rel);
}

if (missing.length) {
  console.error("MISSING AI FILES:", missing);
  process.exit(1);
}

const aiPkg = await fs.readJson(path.join(aiResult.targetDir, "package.json"));
if (!aiPkg.dependencies?.["ai"] || !aiPkg.dependencies?.["@ai-sdk/openai"] || !aiPkg.dependencies?.["@ai-sdk/react"]) {
  console.error("MISSING AI DEPENDENCIES", aiPkg.dependencies);
  process.exit(1);
}

const aiEnv = await fs.readFile(path.join(aiResult.targetDir, ".env.example"), "utf8");
if (!aiEnv.includes("OPENAI_API_KEY=")) {
  console.error("OPENAI_API_KEY NOT IN .env.example");
  process.exit(1);
}

const aiNovaConfig = await fs.readJson(path.join(aiResult.targetDir, ".nova/project.json"));
if (aiNovaConfig.template !== "ai" || !aiNovaConfig.plugins.includes("ai")) {
  console.error("AI NOT PROPERLY RECORDED IN MANIFEST", aiNovaConfig);
  process.exit(1);
}

console.log("SMOKE TEST OK");



