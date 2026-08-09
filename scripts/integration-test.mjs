import assert from "node:assert/strict";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { generateProject } from "../dist/generator.js";
import {
  addFeaturesToProject,
  removePlugins,
  generateDeploymentConfig,
  infoProject,
  statusProject,
  doctorProject,
  diffProject,
  repairProject,
  upgradeProject,
  cleanProject,
} from "../dist/index.js";



const tmpRoot = path.join(os.tmpdir(), "nova-integration-test-" + Date.now());
await fs.ensureDir(tmpRoot);
process.chdir(tmpRoot);

console.log("Running Integration Tests in:", tmpRoot);


try {
  // Test 1: Minimal project generation + nova add drizzle + nova remove drizzle
  const projectDir = path.join(tmpRoot, "test-drizzle-app");
  await generateProject({
    projectName: "test-drizzle-app",
    packageManager: "pnpm",
    uiLibrary: "shadcn",
    installNow: false,
    initGit: false,
    features: {
      prisma: false,
      drizzle: false,
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
    },
  });

  console.log("✓ Base project generated");

  // nova add drizzle
  const addResult = await addFeaturesToProject(projectDir, ["drizzle"], { force: true, skipPrompts: true });
  assert.equal(addResult.dependencyIssues.length, 0, "add drizzle should have no dependency issues");
  assert.equal(addResult.outcomes.length, 1, "add drizzle outcome count should be 1");
  assert.ok(await fs.pathExists(path.join(projectDir, "drizzle.config.ts")), "drizzle.config.ts must exist");
  assert.ok(await fs.pathExists(path.join(projectDir, "src/lib/db/schema.ts")), "schema.ts must exist");
  assert.ok(await fs.pathExists(path.join(projectDir, "src/lib/db/client.ts")), "client.ts must exist");

  const pkgAfterAdd = await fs.readJson(path.join(projectDir, "package.json"));
  assert.ok(pkgAfterAdd.dependencies["drizzle-orm"], "drizzle-orm must be added to dependencies");
  assert.ok(pkgAfterAdd.devDependencies["drizzle-kit"], "drizzle-kit must be added to devDependencies");
  assert.ok(pkgAfterAdd.scripts["db:generate"], "db:generate script must be added");

  const novaConfigAfterAdd = await fs.readJson(path.join(projectDir, ".nova.json"));
  assert.ok(novaConfigAfterAdd.plugins.includes("drizzle"), ".nova.json must track drizzle");
  console.log("✓ nova add drizzle passed");

  // nova remove drizzle
  const removeResult = await removePlugins(projectDir, ["drizzle"]);
  assert.deepEqual(removeResult.removed, ["drizzle"]);

  const pkgAfterRemove = await fs.readJson(path.join(projectDir, "package.json"));
  assert.equal(pkgAfterRemove.dependencies["drizzle-orm"], undefined, "drizzle-orm should be removed");
  assert.equal(pkgAfterRemove.devDependencies["drizzle-kit"], undefined, "drizzle-kit should be removed");
  assert.equal(pkgAfterRemove.scripts["db:generate"], undefined, "db:generate should be removed");

  const novaConfigAfterRemove = await fs.readJson(path.join(projectDir, ".nova.json"));
  assert.ok(!novaConfigAfterRemove.plugins.includes("drizzle"), ".nova.json must no longer track drizzle");
  console.log("✓ nova remove drizzle passed");

  // Test 2: nova add trpc + nova remove trpc
  const addTrpcResult = await addFeaturesToProject(projectDir, ["trpc"], { force: true, skipPrompts: true });
  assert.equal(addTrpcResult.dependencyIssues.length, 0, "add trpc should have no dependency issues");
  assert.ok(await fs.pathExists(path.join(projectDir, "src/lib/trpc/root.ts")), "trpc root.ts must exist");
  assert.ok(await fs.pathExists(path.join(projectDir, "src/app/api/trpc/[trpc]/route.ts")), "trpc route.ts must exist");

  const pkgAfterTrpcAdd = await fs.readJson(path.join(projectDir, "package.json"));
  assert.ok(pkgAfterTrpcAdd.dependencies["@trpc/server"], "@trpc/server must be added");
  assert.ok(pkgAfterTrpcAdd.dependencies["@trpc/client"], "@trpc/client must be added");

  const novaConfigAfterTrpcAdd = await fs.readJson(path.join(projectDir, ".nova.json"));
  assert.ok(novaConfigAfterTrpcAdd.plugins.includes("trpc"), ".nova.json must track trpc");
  console.log("✓ nova add trpc passed");

  // nova remove trpc
  const removeTrpcResult = await removePlugins(projectDir, ["trpc"]);
  assert.deepEqual(removeTrpcResult.removed, ["trpc"]);

  const pkgAfterTrpcRemove = await fs.readJson(path.join(projectDir, "package.json"));
  assert.equal(pkgAfterTrpcRemove.dependencies["@trpc/server"], undefined, "@trpc/server should be removed");

  const novaConfigAfterTrpcRemove = await fs.readJson(path.join(projectDir, ".nova.json"));
  assert.ok(!novaConfigAfterTrpcRemove.plugins.includes("trpc"), ".nova.json must no longer track trpc");
  console.log("✓ nova remove trpc passed");

  // Test 3: nova add graphql + nova remove graphql
  const addGraphqlResult = await addFeaturesToProject(projectDir, ["graphql"], { force: true, skipPrompts: true });
  assert.equal(addGraphqlResult.dependencyIssues.length, 0, "add graphql should have no dependency issues");
  assert.ok(await fs.pathExists(path.join(projectDir, "src/lib/graphql/schema.ts")), "graphql schema.ts must exist");
  assert.ok(await fs.pathExists(path.join(projectDir, "src/app/api/graphql/route.ts")), "graphql route.ts must exist");
  assert.ok(await fs.pathExists(path.join(projectDir, "codegen.ts")), "codegen.ts must exist");

  const pkgAfterGraphqlAdd = await fs.readJson(path.join(projectDir, "package.json"));
  assert.ok(pkgAfterGraphqlAdd.dependencies["graphql-yoga"], "graphql-yoga must be added");
  assert.ok(pkgAfterGraphqlAdd.devDependencies["@graphql-codegen/cli"], "@graphql-codegen/cli must be added");
  assert.ok(pkgAfterGraphqlAdd.scripts["codegen"], "codegen script must be added");

  const novaConfigAfterGraphqlAdd = await fs.readJson(path.join(projectDir, ".nova.json"));
  assert.ok(novaConfigAfterGraphqlAdd.plugins.includes("graphql"), ".nova.json must track graphql");
  console.log("✓ nova add graphql passed");

  // nova remove graphql
  const removeGraphqlResult = await removePlugins(projectDir, ["graphql"]);
  assert.deepEqual(removeGraphqlResult.removed, ["graphql"]);

  const pkgAfterGraphqlRemove = await fs.readJson(path.join(projectDir, "package.json"));
  assert.equal(pkgAfterGraphqlRemove.dependencies["graphql-yoga"], undefined, "graphql-yoga should be removed");
  assert.equal(pkgAfterGraphqlRemove.devDependencies["@graphql-codegen/cli"], undefined, "@graphql-codegen/cli should be removed");
  assert.equal(pkgAfterGraphqlRemove.scripts["codegen"], undefined, "codegen script should be removed");

  const novaConfigAfterGraphqlRemove = await fs.readJson(path.join(projectDir, ".nova.json"));
  assert.ok(!novaConfigAfterGraphqlRemove.plugins.includes("graphql"), ".nova.json must no longer track graphql");
  console.log("✓ nova remove graphql passed");

  // Test 4: nova add supabase + nova remove supabase
  const addSupabaseResult = await addFeaturesToProject(projectDir, ["supabase"], { force: true, skipPrompts: true });
  assert.equal(addSupabaseResult.dependencyIssues.length, 0, "add supabase should have no dependency issues");
  assert.ok(await fs.pathExists(path.join(projectDir, "src/lib/supabase/client.ts")), "supabase client.ts must exist");
  assert.ok(await fs.pathExists(path.join(projectDir, "src/lib/supabase/server.ts")), "supabase server.ts must exist");
  assert.ok(await fs.pathExists(path.join(projectDir, "src/lib/supabase/middleware.ts")), "supabase middleware.ts must exist");

  const pkgAfterSupabaseAdd = await fs.readJson(path.join(projectDir, "package.json"));
  assert.ok(pkgAfterSupabaseAdd.dependencies["@supabase/supabase-js"], "@supabase/supabase-js must be added");
  assert.ok(pkgAfterSupabaseAdd.dependencies["@supabase/ssr"], "@supabase/ssr must be added");

  const novaConfigAfterSupabaseAdd = await fs.readJson(path.join(projectDir, ".nova.json"));
  assert.ok(novaConfigAfterSupabaseAdd.plugins.includes("supabase"), ".nova.json must track supabase");
  console.log("✓ nova add supabase passed");

  // nova remove supabase
  const removeSupabaseResult = await removePlugins(projectDir, ["supabase"]);
  assert.deepEqual(removeSupabaseResult.removed, ["supabase"]);

  const pkgAfterSupabaseRemove = await fs.readJson(path.join(projectDir, "package.json"));
  assert.equal(pkgAfterSupabaseRemove.dependencies["@supabase/supabase-js"], undefined, "@supabase/supabase-js should be removed");

  const novaConfigAfterSupabaseRemove = await fs.readJson(path.join(projectDir, ".nova.json"));
  assert.ok(!novaConfigAfterSupabaseRemove.plugins.includes("supabase"), ".nova.json must no longer track supabase");
  console.log("✓ nova remove supabase passed");

  // Test 5: React Native Mobile Template Generation
  const mobileProjectDir = path.join(tmpRoot, "test-mobile-app");
  await generateMobileProject({
    projectName: "test-mobile-app",
    projectType: "react-native",
    packageManager: "npm",
    uiLibrary: "headless",
    installNow: false,
    initGit: false,
    features: {},
  });

  assert.ok(await fs.pathExists(path.join(mobileProjectDir, "package.json")), "mobile package.json must exist");
  assert.ok(await fs.pathExists(path.join(mobileProjectDir, "app.json")), "mobile app.json must exist");
  assert.ok(await fs.pathExists(path.join(mobileProjectDir, "App.tsx")), "mobile App.tsx must exist");
  assert.ok(await fs.pathExists(path.join(mobileProjectDir, "src/theme/colors.ts")), "mobile theme must exist");
  assert.ok(await fs.pathExists(path.join(mobileProjectDir, "src/components/Card.tsx")), "mobile Card must exist");
  assert.ok(await fs.pathExists(path.join(mobileProjectDir, "docs/mobile.md")), "mobile docs must exist");

  const mobilePkg = await fs.readJson(path.join(mobileProjectDir, "package.json"));
  assert.equal(mobilePkg.name, "test-mobile-app");
  assert.ok(mobilePkg.dependencies["expo"], "expo must be in dependencies");
  assert.ok(mobilePkg.dependencies["react-native"], "react-native must be in dependencies");

  const mobileNovaConfig = await fs.readJson(path.join(mobileProjectDir, ".nova.json"));
  assert.equal(mobileNovaConfig.projectType, "react-native", ".nova.json must track projectType as react-native");
  console.log("✓ React Native mobile generation passed");

  // Test 6: Cloud Deployment configuration generation
  const vercelResult = await generateDeploymentConfig("vercel", { targetDir: projectDir, force: true });
  assert.ok(await fs.pathExists(path.join(projectDir, "vercel.json")), "vercel.json must exist");
  assert.ok(await fs.pathExists(path.join(projectDir, ".github/workflows/deploy-vercel.yml")), "deploy-vercel.yml must exist");
  assert.ok(await fs.pathExists(path.join(projectDir, "docs/deployment/vercel.md")), "docs/deployment/vercel.md must exist");
  console.log("✓ Vercel deployment config passed");

  const cloudflareResult = await generateDeploymentConfig("cloudflare", { targetDir: projectDir, force: true });
  assert.ok(await fs.pathExists(path.join(projectDir, "wrangler.toml")), "wrangler.toml must exist");
  assert.ok(await fs.pathExists(path.join(projectDir, ".github/workflows/deploy-cloudflare.yml")), "deploy-cloudflare.yml must exist");
  console.log("✓ Cloudflare deployment config passed");

  const dockerResult = await generateDeploymentConfig("docker", { targetDir: projectDir, force: true });
  assert.ok(await fs.pathExists(path.join(projectDir, "Dockerfile.prod")), "Dockerfile.prod must exist");
  assert.ok(await fs.pathExists(path.join(projectDir, "docker-compose.prod.yml")), "docker-compose.prod.yml must exist");
  console.log("✓ Docker deployment config passed");

  const railwayResult = await generateDeploymentConfig("railway", { targetDir: projectDir, force: true });
  assert.ok(await fs.pathExists(path.join(projectDir, "railway.json")), "railway.json must exist");
  console.log("✓ Railway deployment config passed");

  // Test 7: Project Lifecycle & Maintenance (info, status, doctor, diff, repair, upgrade, clean)
  const info = await infoProject(projectDir);
  assert.equal(info.name, "test-drizzle-app");
  assert.equal(info.packageManager, "pnpm");
  assert.equal(info.uiLibrary, "shadcn");
  assert.ok(info.structure.hasSrcDir);
  console.log("✓ nova info passed");

  const status = await statusProject(projectDir);
  assert.equal(status.name, "test-drizzle-app");
  assert.ok(status.health);
  console.log("✓ nova status passed");

  const doctor = await doctorProject(projectDir);
  assert.ok(doctor.checks.length > 0);
  assert.equal(doctor.errors.length, 0, "Clean project should have 0 doctor errors");
  console.log("✓ nova doctor passed");

  // Intentionally cause configuration drift
  await fs.remove(path.join(projectDir, ".env.example"));
  const driftBeforeRepair = await diffProject(projectDir);
  assert.ok(driftBeforeRepair.length > 0, "diffProject must detect missing .env.example");
  assert.ok(driftBeforeRepair.some((d) => d.type === "missing-template-file"));
  console.log("✓ nova diff drift detection passed");

  // Run repair
  const repair = await repairProject(projectDir);
  assert.ok(repair.repairedFiles.includes(".env.example"), "repairProject must restore .env.example");
  assert.ok(await fs.pathExists(path.join(projectDir, ".env.example")));
  assert.ok(await fs.pathExists(path.join(projectDir, ".nova/project.json")), ".nova/project.json must exist");
  console.log("✓ nova repair passed");

  // Verify diff clears after repair
  const driftAfterRepair = await diffProject(projectDir);
  assert.equal(driftAfterRepair.filter((d) => d.type === "missing-template-file").length, 0);
  console.log("✓ drift resolution verified");

  // Test upgrade (dry-run and execution)
  const dryUpgrade = await upgradeProject(projectDir, { dryRun: true });
  assert.equal(dryUpgrade.dryRun, true);
  const realUpgrade = await upgradeProject(projectDir, { dryRun: false });
  assert.equal(realUpgrade.dryRun, false);
  console.log("✓ nova upgrade passed");

  // Test clean (create dummy cache, verify clean removes it)
  const dummyNextCache = path.join(projectDir, ".next");
  await fs.ensureDir(dummyNextCache);
  const dryClean = await cleanProject(projectDir, true);
  assert.ok(dryClean.includes(".next"));
  assert.ok(await fs.pathExists(dummyNextCache), ".next should still exist after dry clean");

  const realClean = await cleanProject(projectDir, false);
  assert.ok(realClean.includes(".next"));
  assert.ok(!(await fs.pathExists(dummyNextCache)), ".next should be deleted after real clean");
  console.log("✓ nova clean passed");

  console.log("ALL INTEGRATION TESTS PASSED");
} finally {
  process.chdir(os.tmpdir());
  await fs.remove(tmpRoot).catch(() => {});
}




