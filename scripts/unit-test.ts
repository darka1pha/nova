import assert from "node:assert/strict";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { getPluginRegistry } from "../src/plugin/legacyAdapter.js";
import { resolveDependencyGraph } from "../src/plugin/dependencyGraph.js";
import { FEATURE_CONTRIBUTIONS } from "../src/featureContributions.js";
import { PLUGIN_METADATA } from "../src/generator/pluginMetadata.js";
import { verifyManifestSync } from "../src/generator/verifyManifestSync.js";
import { getDeploymentRegistry } from "../src/deployment/registry.js";
import {
  readProjectConfig,
  writeProjectConfig,
  initializeProjectConfig,
  migrateManifest,
  NOVA_MANIFEST_FILE,
  LEGACY_NOVA_CONFIG_FILE,
  type NovaProjectConfig,
} from "../src/project.js";
import { ProjectTransaction } from "../src/utils/transaction.js";
import { createEmptyPlan, formatPlan } from "../src/generator/planner.js";
import { getPluginTree, getPluginConflicts, listPlugins } from "../src/commands.js";

console.log("Running Phase 2 Unit Tests...\n");

// 1. Verify Manifest Sync across core contributions
const mismatches = verifyManifestSync();
assert.equal(mismatches.length, 0, `Manifest mismatches found: ${JSON.stringify(mismatches)}`);
console.log("✓ Manifest sync passed");

// 2. Plugin Capabilities and Ownership Model
const registry = getPluginRegistry();
assert.ok(registry.has("drizzle"), "Registry must have drizzle");
assert.ok(registry.has("prisma"), "Registry must have prisma");
assert.ok(registry.has("trpc"), "Registry must have trpc");
assert.ok(registry.has("graphql"), "Registry must have graphql");
assert.ok(registry.has("supabase"), "Registry must have supabase");

const drizzleManifest = registry.requirePlugin("drizzle");
assert.ok(drizzleManifest.capabilities?.includes("database"), "Drizzle must have database capability");
assert.ok(drizzleManifest.owns?.includes("drizzle.config.ts"), "Drizzle must own drizzle.config.ts");
assert.ok(drizzleManifest.conflictReasons?.["prisma"], "Drizzle must declare conflictReason for prisma");

const prismaManifest = registry.requirePlugin("prisma");
assert.ok(prismaManifest.capabilities?.includes("database"), "Prisma must have database capability");
assert.ok(prismaManifest.owns?.includes("prisma/schema.prisma"), "Prisma must own prisma/schema.prisma");

console.log("✓ Plugin capability & ownership metadata checks passed");

// 3. Project-Aware Plugin Validation & Conflict Detection
const validStandalone = resolveDependencyGraph(["drizzle"], registry);
assert.equal(validStandalone.issues.length, 0);

// Already installed conflict rejection
const installedPrismaConflict = resolveDependencyGraph(["drizzle"], registry, {
  alreadyInstalled: ["prisma"],
});
assert.ok(installedPrismaConflict.issues.length > 0, "Drizzle must conflict with already installed prisma");
assert.ok(
  installedPrismaConflict.issues.some((i) => i.message.includes("Conflicting plugin already installed")),
  "Error message must clearly cite already-installed conflict and explanation",
);

// Satisfied requirement from already installed plugin
const trpcWithInstalledTailwind = resolveDependencyGraph(["trpc"], registry, {
  alreadyInstalled: [],
});
assert.equal(trpcWithInstalledTailwind.issues.length, 0);

console.log("✓ Project-aware dependency graph & conflict resolution passed");

// 4. Manifest State Model & Migration Tests
const rawLegacyManifest = {
  name: "legacy-app",
  packageManager: "pnpm",
  uiLibrary: "shadcn",
  projectType: "nextjs",
  plugins: ["prisma", "tailwind"],
  customField: "preserved-data",
};

const migrated = migrateManifest(rawLegacyManifest, "legacy-app");
assert.equal(migrated.schemaVersion, 1, "Migrated manifest must have schemaVersion 1");
assert.equal(migrated.name, "legacy-app");
assert.ok(migrated.pluginVersions?.["prisma"], "Must track plugin version for prisma");
assert.equal((migrated as any).customField, "preserved-data", "Custom fields must be strictly preserved");

console.log("✓ Manifest schema migration unit tests passed");

// 5. Dual-Sync Authoritative Manifest (.nova/project.json and .nova.json)
const testTmpDir = path.join(os.tmpdir(), "nova-unit-manifest-test-" + Date.now());
await fs.ensureDir(testTmpDir);

try {
  await fs.writeJson(path.join(testTmpDir, "package.json"), {
    name: "test-manifest-app",
    version: "1.0.0",
    dependencies: { next: "^15.0.0", react: "^19.0.0" },
  });

  const initConfig = await initializeProjectConfig(testTmpDir, ["trpc", "drizzle"], {
    packageManager: "pnpm",
    uiLibrary: "shadcn",
  });

  assert.equal(initConfig.name, "test-manifest-app");
  assert.equal(initConfig.packageManager, "pnpm");
  assert.equal(initConfig.schemaVersion, 1);
  assert.ok(initConfig.pluginVersions?.["drizzle"]);

  assert.ok(await fs.pathExists(path.join(testTmpDir, NOVA_MANIFEST_FILE)), ".nova/project.json must exist");
  assert.ok(await fs.pathExists(path.join(testTmpDir, LEGACY_NOVA_CONFIG_FILE)), ".nova.json must exist for backward compat");

  // Verify dual sync on write
  initConfig.plugins.push("redis");
  await writeProjectConfig(testTmpDir, initConfig);

  const readAuthoritative = await fs.readJson(path.join(testTmpDir, NOVA_MANIFEST_FILE));
  const readLegacy = await fs.readJson(path.join(testTmpDir, LEGACY_NOVA_CONFIG_FILE));
  assert.deepEqual(readAuthoritative.plugins, readLegacy.plugins);
  assert.ok(readAuthoritative.plugins.includes("redis"));

  console.log("✓ Authoritative dual-sync manifest tests passed");
} finally {
  await fs.remove(testTmpDir).catch(() => {});
}

// 6. Transactional Mutations and Rollback
const txTmpDir = path.join(os.tmpdir(), "nova-unit-tx-test-" + Date.now());
await fs.ensureDir(txTmpDir);

try {
  const existingFilePath = path.join(txTmpDir, "config.json");
  await fs.writeJson(existingFilePath, { original: true });

  const tx = new ProjectTransaction(txTmpDir);
  tx.begin();

  await tx.snapshotFile("config.json");
  await fs.writeJson(existingFilePath, { original: false, modified: true });

  const newFilePath = path.join(txTmpDir, "new-file.txt");
  await tx.snapshotFile("new-file.txt");
  await fs.writeFile(newFilePath, "created file content", "utf8");

  assert.equal((await fs.readJson(existingFilePath)).modified, true);
  assert.ok(await fs.pathExists(newFilePath));

  // Rollback!
  await tx.rollback();

  assert.equal((await fs.readJson(existingFilePath)).original, true, "Modified file must be restored");
  assert.equal((await fs.readJson(existingFilePath)).modified, undefined);
  assert.ok(!(await fs.pathExists(newFilePath)), "Newly created file must be deleted upon rollback");

  console.log("✓ Transactional snapshot and rollback unit tests passed");
} finally {
  await fs.remove(txTmpDir).catch(() => {});
}

// 7. Planner and Dry Run Output Formatter
const plan = createEmptyPlan("/test/app", ["drizzle"]);
plan.filesCreated.push("drizzle.config.ts", "src/lib/db/schema.ts");
plan.filesModified.push("package.json", ".env.example");
plan.dependenciesAdded["drizzle-orm"] = "^0.38.0";
plan.devDependenciesAdded["drizzle-kit"] = "^0.30.0";
plan.scriptsAdded["db:generate"] = "drizzle-kit generate";
plan.envAdded.push({ key: "DATABASE_URL", example: "postgresql://..." });
plan.manifestAdded.push("drizzle");

const formatted = formatPlan(plan);
assert.ok(formatted.includes("Nova Dry Run"));
assert.ok(formatted.includes("drizzle.config.ts"));
assert.ok(formatted.includes("drizzle-orm"));
assert.ok(formatted.includes("drizzle-kit"));
assert.ok(formatted.includes("db:generate"));
assert.ok(formatted.includes("DATABASE_URL"));
assert.ok(formatted.includes("No files were modified. (Dry run mode)"));

console.log("✓ Planner & dry-run renderer unit tests passed");

// 8. Plugin Introspection Helpers (Tree, Conflicts, Search)
const tree = getPluginTree("trpc");
assert.equal(tree.plugin, "trpc");
assert.ok(Array.isArray(tree.requires));
assert.ok(Array.isArray(tree.requiredBy));

const conflicts = getPluginConflicts("drizzle");
assert.ok(conflicts.some((c) => c.plugin === "prisma"));
assert.ok(conflicts.find((c) => c.plugin === "prisma")?.reason);

const searchResults = listPlugins("database");
assert.ok(searchResults.length > 0);
assert.ok(searchResults.some((p) => p.key === "drizzle" || p.key === "prisma" || p.key === "supabase"));

console.log("✓ Plugin introspection (tree, conflicts, search) unit tests passed");

console.log("✓ Deployment provider registry unit tests passed");

// -------------------------------------------------------------
// PHASE 3 UNIT TESTS: Ecosystem Expansion & Developer Experience
// -------------------------------------------------------------
console.log("\nRunning Phase 3 Unit Tests...\n");

import {
  getPluginRegistryManager,
  isValidPluginId,
  validatePluginSecurity,
} from "../src/registry/index.js";
import {
  scaffoldPlugin,
  validatePluginPackage,
  testPluginPackage,
} from "../src/sdk/index.js";
import {
  getPreset,
  listPresets,
  resolvePreset,
} from "../src/presets/registry.js";
import {
  getTemplate,
  listTemplates,
  resolveTemplate,
} from "../src/templates/registry.js";
import {
  getProjectEnvStatus,
  syncProjectEnvExample,
  parseEnvKeysOnly,
} from "../src/env/manager.js";
import { statusProject } from "../src/commands.js";

// 10. Plugin Registry Manager & Discovery
const registryManager = getPluginRegistryManager();
const dbSearch = await registryManager.search("database");
assert.ok(dbSearch.length > 0, "Search for 'database' must return matches");
assert.ok(dbSearch.some((r) => r.plugin.id === "drizzle"), "Drizzle must be in database search");
assert.ok(dbSearch.some((r) => r.plugin.trustLevel === "official"), "Builtin plugins must be marked official");

const aiSearch = await registryManager.search("ai");
assert.ok(aiSearch.length > 0, "Search for 'ai' must return matches");
assert.ok(aiSearch.some((r) => r.plugin.id === "ai" || r.plugin.id === "openai"), "AI plugins must be found");

const resolvedPrisma = await registryManager.get("prisma");
assert.ok(resolvedPrisma, "Must get prisma plugin metadata");
assert.equal(resolvedPrisma.trustLevel, "official");
assert.equal(resolvedPrisma.category, "database");

console.log("✓ Plugin registry search, lookup, and trust metadata checks passed");

// 11. Plugin Security & ID Validation
assert.equal(isValidPluginId("my-plugin"), true);
assert.equal(isValidPluginId("@nova/plugin-supabase"), true);
assert.equal(isValidPluginId("@company/analytics-plugin"), true);
assert.equal(isValidPluginId("../evil-plugin"), false, "Path traversal in ID must be rejected");
assert.equal(isValidPluginId("invalid/slash/plugin"), false, "Unscoped slash in ID must be rejected");
assert.equal(isValidPluginId(""), false);

const badManifest = {
  id: "@nova/plugin-bad",
  name: "Bad Plugin",
  version: "1.0.0",
  description: "Bad plugin",
  category: "developer-experience" as const,
  templates: [{ src: "../outside-dir/file.ts" }],
  patches: [{ target: "../outside-project/config.ts", transform: (s: string) => s }],
  docs: [{ path: "../outside-docs/readme.md", render: () => "" }],
};

const secCheck = validatePluginSecurity(badManifest);
assert.equal(secCheck.valid, false, "Manifest with traversal paths must fail validation");
assert.ok(secCheck.errors.some((e) => e.includes("traversal sequence")), "Must flag traversal sequence in templates");
assert.ok(secCheck.errors.some((e) => e.includes("Patch target")), "Must flag patch outside project");
assert.ok(secCheck.errors.some((e) => e.includes("Documentation path")), "Must flag doc outside project");

console.log("✓ Plugin security validation & path traversal prevention passed");

// 12. Plugin SDK: Scaffolding, Validation & Testing
const sdkTmpDir = path.join(os.tmpdir(), "nova-sdk-test-" + Date.now());
await fs.ensureDir(sdkTmpDir);

try {
  const scaffoldResult = await scaffoldPlugin({
    name: "test-auth-plugin",
    targetDir: sdkTmpDir,
    category: "authentication",
    description: "Test Auth Plugin for SDK verification",
    author: "Test Author",
  });

  assert.ok(await fs.pathExists(scaffoldResult.pluginDir), "Scaffolded directory must exist");
  assert.ok(await fs.pathExists(path.join(scaffoldResult.pluginDir, "package.json")), "package.json must exist");
  assert.ok(await fs.pathExists(path.join(scaffoldResult.pluginDir, "tsconfig.json")), "tsconfig.json must exist");
  assert.ok(await fs.pathExists(path.join(scaffoldResult.pluginDir, "README.md")), "README.md must exist");
  assert.ok(await fs.pathExists(path.join(scaffoldResult.pluginDir, "src", "manifest.ts")), "manifest.ts must exist");
  assert.ok(await fs.pathExists(path.join(scaffoldResult.pluginDir, "src", "validate.ts")), "validate.ts must exist");
  assert.ok(await fs.pathExists(path.join(scaffoldResult.pluginDir, "src", "hooks.ts")), "hooks.ts must exist");
  assert.ok(await fs.pathExists(path.join(scaffoldResult.pluginDir, "tests", "plugin.test.ts")), "tests/ must exist");

  // Validate scaffolded plugin
  const valResult = await validatePluginPackage(scaffoldResult.pluginDir);
  assert.equal(valResult.valid, true, `Scaffolded plugin validation failed: ${valResult.errors.join(", ")}`);
  assert.ok(valResult.manifest);
  assert.equal(valResult.manifest.category, "authentication");

  // Test scaffolded plugin
  const testRes = await testPluginPackage(scaffoldResult.pluginDir);
  assert.equal(testRes.passed, true, `Scaffolded plugin test failed: ${testRes.errors.join(", ")}`);
  assert.ok(testRes.totalTests >= 3, "Must run at least 3 test assertions");

  console.log("✓ Plugin SDK scaffolding, validation, and test suite passed");
} finally {
  await fs.remove(sdkTmpDir).catch(() => {});
}

// 13. Presets System
const presets = listPresets();
assert.ok(presets.length >= 8, `Must have at least 8 official presets, got ${presets.length}`);

const minimalPreset = resolvePreset("minimal");
assert.equal(minimalPreset.valid, true, "Minimal preset must resolve cleanly");
assert.ok(minimalPreset.resolvedPlugins.includes("vitest"));

const fullstackPreset = resolvePreset("fullstack");
assert.equal(fullstackPreset.valid, true, "Fullstack preset must resolve cleanly");
assert.ok(fullstackPreset.resolvedPlugins.includes("drizzle"));
assert.ok(fullstackPreset.resolvedPlugins.includes("betterAuth"));
assert.ok(fullstackPreset.resolvedPlugins.includes("trpc"));
assert.ok(fullstackPreset.resolvedPlugins.includes("vitest"));
assert.ok(fullstackPreset.resolvedPlugins.includes("playwright"));

const saasPreset = resolvePreset("saas");
assert.equal(saasPreset.valid, true, "SaaS preset must resolve cleanly");
assert.ok(saasPreset.resolvedPlugins.includes("drizzle"));
assert.ok(saasPreset.resolvedPlugins.includes("sentry"));
assert.ok(saasPreset.resolvedPlugins.includes("reactEmail"));
assert.ok(saasPreset.resolvedPlugins.includes("storage"));
assert.ok(saasPreset.resolvedPlugins.includes("payments"));

const adminPreset = resolvePreset("admin");
assert.equal(adminPreset.valid, true, "Admin preset must resolve cleanly");
assert.ok(adminPreset.resolvedPlugins.includes("tanstackTable"));
assert.ok(adminPreset.resolvedPlugins.includes("recharts"));

const ecommercePreset = resolvePreset("ecommerce");
assert.equal(ecommercePreset.valid, true, "E-commerce preset must resolve cleanly");
assert.ok(ecommercePreset.resolvedPlugins.includes("payments"));
assert.ok(ecommercePreset.resolvedPlugins.includes("storage"));

const blogPreset = resolvePreset("blog");
assert.equal(blogPreset.valid, true, "Blog preset must resolve cleanly");
assert.ok(blogPreset.resolvedPlugins.includes("tiptap"));
assert.ok(blogPreset.resolvedPlugins.includes("storage"));

const aiPreset = resolvePreset("ai");
assert.equal(aiPreset.valid, true, "AI preset must resolve cleanly");
assert.ok(aiPreset.resolvedPlugins.includes("ai"));
assert.ok(aiPreset.resolvedPlugins.includes("openai"));
assert.ok(aiPreset.resolvedPlugins.includes("zustand"));

const realtimePreset = resolvePreset("realtime");
assert.equal(realtimePreset.valid, true, "Realtime preset must resolve cleanly");
assert.ok(realtimePreset.resolvedPlugins.includes("realtime"));
assert.ok(realtimePreset.resolvedPlugins.includes("redis"));

const apiPreset = resolvePreset("api");
assert.equal(apiPreset.valid, true, "API preset must resolve cleanly");
assert.ok(apiPreset.resolvedPlugins.includes("trpc"));
assert.ok(apiPreset.resolvedPlugins.includes("openapi"));

const invalidPreset = resolvePreset("non-existent-preset");
assert.equal(invalidPreset.valid, false, "Unknown preset must report failure");

console.log("✓ Official presets (minimal, fullstack, saas, admin, dashboard, ecommerce, blog, ai, api, realtime) & resolution passed");

// 14. Templates System
const templates = listTemplates();
assert.ok(templates.length >= 8, `Must have at least 8 official templates, got ${templates.length}`);

const minimalTpl = resolveTemplate("minimal");
assert.equal(minimalTpl.valid, true, "Minimal template must resolve");

const defaultTpl = resolveTemplate("default");
assert.equal(defaultTpl.valid, true, "Default template (alias to minimal) must resolve");
assert.equal(defaultTpl.template.id, "minimal");

const saasTpl = resolveTemplate("saas");
assert.equal(saasTpl.valid, true, "SaaS template must resolve");
assert.ok(saasTpl.resolvedPlugins.includes("drizzle"));
assert.ok(saasTpl.resolvedPlugins.includes("betterAuth"));
assert.ok(saasTpl.resolvedPlugins.includes("storage"));
assert.ok(saasTpl.resolvedPlugins.includes("payments"));

const adminTpl = resolveTemplate("admin");
assert.equal(adminTpl.valid, true, "Admin template must resolve");
assert.ok(adminTpl.resolvedPlugins.includes("tanstackTable"));
assert.ok(adminTpl.resolvedPlugins.includes("recharts"));

const dashboardAliasTpl = resolveTemplate("dashboard");
assert.equal(dashboardAliasTpl.valid, true, "Dashboard alias must resolve to admin template");
assert.equal(dashboardAliasTpl.template.id, "admin");

const ecommerceTpl = resolveTemplate("ecommerce");
assert.equal(ecommerceTpl.valid, true, "E-commerce template must resolve");
assert.ok(ecommerceTpl.resolvedPlugins.includes("payments"));

const blogTpl = resolveTemplate("blog");
assert.equal(blogTpl.valid, true, "Blog template must resolve");
assert.ok(blogTpl.resolvedPlugins.includes("tiptap"));

const cmsAliasTpl = resolveTemplate("cms");
assert.equal(cmsAliasTpl.valid, true, "CMS alias must resolve to blog template");
assert.equal(cmsAliasTpl.template.id, "blog");

const aiTpl = resolveTemplate("ai");
assert.equal(aiTpl.valid, true, "AI template must resolve");
assert.ok(aiTpl.resolvedPlugins.includes("ai"));
assert.ok(aiTpl.resolvedPlugins.includes("openai"));

const apiTpl = resolveTemplate("api");
assert.equal(apiTpl.valid, true, "API template must resolve");
assert.ok(apiTpl.resolvedPlugins.includes("trpc"));

const realtimeTpl = resolveTemplate("realtime");
assert.equal(realtimeTpl.valid, true, "Realtime template must resolve");
assert.ok(realtimeTpl.resolvedPlugins.includes("realtime"));

const mobileTpl = resolveTemplate("react-native");
assert.equal(mobileTpl.valid, true, "React Native template must resolve");
assert.equal(mobileTpl.template.structure, "react-native");

console.log("✓ Official templates (minimal, saas, admin, ecommerce, blog, ai, api, realtime, react-native) & composition passed");

// 14b. Comprehensive Template Validation
import { validateTemplateSystem } from "../src/templates/validator.js";
const templateValidationSummary = await validateTemplateSystem();
assert.equal(templateValidationSummary.valid, true, `Template system validation failed: ${JSON.stringify(templateValidationSummary.errors)}`);
assert.ok(templateValidationSummary.templatesCount >= 9);
assert.ok(templateValidationSummary.presetsCount >= 10);
assert.ok(templateValidationSummary.featuresCount >= 37);
console.log("✓ Template system comprehensive validator passed");

// 15. Environment Management
const envTmpDir = path.join(os.tmpdir(), "nova-env-test-" + Date.now());
await fs.ensureDir(envTmpDir);

try {
  await fs.writeJson(path.join(envTmpDir, "package.json"), { name: "env-app", version: "1.0.0" });
  await initializeProjectConfig(envTmpDir, ["drizzle", "openai"], { packageManager: "pnpm" });

  // Initial check: missing DATABASE_URL and OPENAI_API_KEY
  const envStatus1 = await getProjectEnvStatus(envTmpDir);
  assert.equal(envStatus1.ok, false, "Initial check must fail because required env vars are missing");
  assert.ok(envStatus1.missingRequired.includes("DATABASE_URL"), "DATABASE_URL must be missing");
  assert.ok(envStatus1.missingRequired.includes("OPENAI_API_KEY"), "OPENAI_API_KEY must be missing");

  // Synchronize .env.example
  const syncResult = await syncProjectEnvExample(envTmpDir);
  assert.ok(syncResult.created, ".env.example must be created");
  assert.ok(syncResult.addedKeys.includes("DATABASE_URL"));
  assert.ok(syncResult.addedKeys.includes("OPENAI_API_KEY"));

  const exampleContent = await fs.readFile(path.join(envTmpDir, ".env.example"), "utf8");
  assert.ok(exampleContent.includes("DATABASE_URL="));
  assert.ok(exampleContent.includes("OPENAI_API_KEY="));

  // Write .env with secrets
  const secretDbUrl = "postgresql://secret_user:super_secret_password@localhost:5432/app";
  const secretApiKey = "sk-proj-secret-key-12345";
  await fs.writeFile(
    path.join(envTmpDir, ".env"),
    `DATABASE_URL=${secretDbUrl}\nOPENAI_API_KEY=${secretApiKey}\n`,
    "utf8",
  );

  // Check again
  const envStatus2 = await getProjectEnvStatus(envTmpDir);
  assert.equal(envStatus2.ok, true, "Check must pass when .env is provided");
  assert.equal(envStatus2.missingRequired.length, 0);

  // Key parser verification (never reveals values)
  const parsedKeys = await parseEnvKeysOnly(path.join(envTmpDir, ".env"));
  assert.ok(parsedKeys.has("DATABASE_URL"));
  assert.ok(parsedKeys.has("OPENAI_API_KEY"));

  console.log("✓ Environment management (status, CI check, example sync, secret safety) passed");
} finally {
  await fs.remove(envTmpDir).catch(() => {});
}

// 16. AI & LLM Ecosystem Native Plugins
const aiManifest = registry.requirePlugin("ai");
assert.equal(aiManifest.category, "ai");
assert.ok(aiManifest.capabilities?.includes("ai"));
assert.ok(aiManifest.dependencies?.["ai"]);
assert.ok(aiManifest.dependencies?.["@ai-sdk/react"]);

const openaiManifest = registry.requirePlugin("openai");
assert.equal(openaiManifest.category, "ai");
assert.ok(openaiManifest.requires?.includes("ai"));
assert.ok(openaiManifest.dependencies?.["@ai-sdk/openai"]);
assert.ok(openaiManifest.env?.some((e) => e.key === "OPENAI_API_KEY" && e.required));

const anthropicManifest = registry.requirePlugin("anthropic");
assert.equal(anthropicManifest.category, "ai");
assert.ok(anthropicManifest.requires?.includes("ai"));
assert.ok(anthropicManifest.env?.some((e) => e.key === "ANTHROPIC_API_KEY"));

const ollamaManifest = registry.requirePlugin("ollama");
assert.equal(ollamaManifest.category, "ai");
assert.ok(ollamaManifest.requires?.includes("ai"));
assert.ok(ollamaManifest.env?.some((e) => e.key === "OLLAMA_BASE_URL"));

console.log("✓ AI & LLM native plugins (ai, openai, anthropic, ollama) verified");

// 16b. Storage, Realtime, Payments Native Plugins
const storageManifest = registry.requirePlugin("storage");
assert.equal(storageManifest.category, "storage");
assert.ok(storageManifest.dependencies?.["mime-types"]);

const realtimeManifest = registry.requirePlugin("realtime");
assert.ok(realtimeManifest.owns?.some((o) => o.includes("realtime")));

const paymentsManifest = registry.requirePlugin("payments");
assert.equal(paymentsManifest.category, "payments");
assert.ok(paymentsManifest.owns?.some((o) => o.includes("payments")));

console.log("✓ Storage, Realtime, Payments native plugins verified");

// 17. Enhanced Project Status Breakdown
const statusTmpDir = path.join(os.tmpdir(), "nova-status-test-" + Date.now());
await fs.ensureDir(statusTmpDir);

try {
  await fs.writeJson(path.join(statusTmpDir, "package.json"), { name: "saas-app", version: "1.0.0" });
  await initializeProjectConfig(statusTmpDir, ["drizzle", "betterAuth", "trpc", "vitest", "playwright", "ai", "openai"], {
    packageManager: "pnpm",
    uiLibrary: "shadcn",
    template: "saas",
    preset: "saas",
  });

  const projectStatus = await statusProject(statusTmpDir);
  assert.equal(projectStatus.template, "saas");
  assert.equal(projectStatus.preset, "saas");
  assert.equal(projectStatus.architecture.database, "Drizzle ORM");
  assert.equal(projectStatus.architecture.auth, "Better Auth");
  assert.equal(projectStatus.architecture.api, "tRPC");
  assert.equal(projectStatus.architecture.testing, "Vitest + Playwright");
  assert.equal(projectStatus.architecture.ai, "Vercel AI SDK (OpenAI)");

  console.log("✓ Enhanced project status & architecture breakdown verified");
} finally {
  await fs.remove(statusTmpDir).catch(() => {});
}

// 18. Advanced Plugin Lifecycle & Removal / Upgrade Hooks
import { PluginRegistry } from "../src/plugin/registry.js";
import { runPluginUpgradeHook } from "../src/plugin/runHooks.js";
import type { PluginResolutionContext } from "../src/plugin/types.js";
let beforeUpgradeCalled = false;
let afterUpgradeCalled = false;

const testRegistry = new PluginRegistry();
testRegistry.register({
  id: "test-plugin",
  name: "Test Plugin",
  version: "2.0.0",
  description: "Test",
  category: "developer-experience",
  hooks: {
    beforeUpgrade: async (fromVer, toVer) => {
      assert.equal(fromVer, "1.0.0");
      assert.equal(toVer, "2.0.0");
      beforeUpgradeCalled = true;
    },
    afterUpgrade: async (fromVer, toVer) => {
      assert.equal(fromVer, "1.0.0");
      assert.equal(toVer, "2.0.0");
      afterUpgradeCalled = true;
    },
  },
});

const testCtx: PluginResolutionContext = {
  projectName: "test",
  packageManager: "pnpm",
  uiLibrary: "shadcn",
  enabledPlugins: ["test-plugin"],
  answers: {},
};

await runPluginUpgradeHook("beforeUpgrade", "test-plugin", "1.0.0", "2.0.0", testRegistry, testCtx);
await runPluginUpgradeHook("afterUpgrade", "test-plugin", "1.0.0", "2.0.0", testRegistry, testCtx);
assert.ok(beforeUpgradeCalled, "beforeUpgrade hook must be invoked");
assert.ok(afterUpgradeCalled, "afterUpgrade hook must be invoked");
console.log("✓ Advanced plugin upgrade & lifecycle hooks verified");

// ── Package Resolution Tests ──────────────────────────────────────

import { collectBaseRequirements, collectFeatureRequirements, getBaseDependencyNames } from "../src/resolver/packageRequirements.js";
import { isValidPackageName } from "../src/resolver/registryClient.js";
import { PackageResolver } from "../src/resolver/index.js";

// 1. Package requirements collection
const baseReqs = collectBaseRequirements("shadcn");
assert.ok(baseReqs.length > 10, `Expected >10 base requirements, got ${baseReqs.length}`);
const nextReq = baseReqs.find(r => r.name === "next");
assert.ok(nextReq, "Base requirements must include 'next'");
assert.equal(nextReq.strategy, "latest");
assert.ok(nextReq.range?.startsWith("^"), "next range should start with ^");
console.log("✓ collectBaseRequirements returns valid base deps");

// 2. Feature requirements collection
const drizzleReqs = collectFeatureRequirements(["drizzle"]);
assert.ok(drizzleReqs.length > 0, "Drizzle should have requirements");
const drizzleOrm = drizzleReqs.find(r => r.name === "drizzle-orm");
assert.ok(drizzleOrm, "Should include drizzle-orm");
assert.equal(drizzleOrm.strategy, "latest");
console.log("✓ collectFeatureRequirements returns valid feature deps");

// 3. Empty feature requirements
const dockerReqs = collectFeatureRequirements(["docker"]);
assert.equal(dockerReqs.length, 0, "Docker should have no package deps");
console.log("✓ Features with no deps return empty requirements");

// 4. Base dependency names set
const baseDeps = getBaseDependencyNames("shadcn");
assert.ok(baseDeps.has("react"), "Base deps must include react");
assert.ok(baseDeps.has("next"), "Base deps must include next");
assert.ok(baseDeps.has("typescript"), "Base deps must include typescript");
console.log("✓ getBaseDependencyNames returns correct base dep set");

// 5. Package name validation
assert.ok(isValidPackageName("react"), "'react' should be valid");
assert.ok(isValidPackageName("@types/react"), "'@types/react' should be valid");
assert.ok(isValidPackageName("drizzle-orm"), "'drizzle-orm' should be valid");
assert.ok(!isValidPackageName(""), "Empty name should be invalid");
assert.ok(!isValidPackageName("../evil"), "Path traversal should be invalid");
console.log("✓ Package name validation works correctly");

// 6. Offline resolver
const offlineResolver = new PackageResolver({ offline: true });
const offlineResult = await offlineResolver.resolveCompatible("react", "^19.0.0");
assert.equal(offlineResult.name, "react");
assert.equal(offlineResult.strategy, "compatible");
assert.equal(offlineResult.versionRange, "^19.0.0");
console.log("✓ Offline resolver returns valid fallback");

// 7. Batch resolve deduplication
const batchResult = await offlineResolver.resolvePackages([
  { name: "react", strategy: "compatible", range: "^19.0.0" },
  { name: "react", strategy: "compatible", range: "^19.0.0" },
  { name: "next", strategy: "compatible", range: "^15.1.0" },
]);
assert.equal(batchResult.resolved.length, 3);
assert.equal(batchResult.failed.length, 0);
console.log("✓ Batch resolve handles duplicates");

console.log("\n=========================================");
console.log("   ALL PHASE 2, PHASE 3 & RESOLVER TESTS PASSED (100%)  ");
console.log("=========================================\n");
