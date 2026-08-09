import assert from "node:assert/strict";
import { getPluginRegistry } from "../src/plugin/legacyAdapter.js";
import { resolveDependencyGraph } from "../src/plugin/dependencyGraph.js";
import { FEATURE_CONTRIBUTIONS } from "../src/featureContributions.js";
import { PLUGIN_METADATA } from "../src/generator/pluginMetadata.js";
import { verifyManifestSync } from "../src/generator/verifyManifestSync.js";

console.log("Running Unit Tests...");

// 1. Verify Manifest Sync
const mismatches = verifyManifestSync();
assert.equal(mismatches.length, 0, `Manifest mismatches found: ${JSON.stringify(mismatches)}`);
console.log("✓ Manifest sync passed");

// 2. Registry checks
const registry = getPluginRegistry();
assert.ok(registry.has("drizzle"), "Registry must have drizzle");
assert.ok(registry.has("prisma"), "Registry must have prisma");
assert.ok(registry.has("trpc"), "Registry must have trpc");
assert.ok(registry.has("graphql"), "Registry must have graphql");
assert.ok(registry.has("supabase"), "Registry must have supabase");

const trpcManifest = registry.requirePlugin("trpc");
assert.equal(trpcManifest.category, "developer-experience");
assert.ok(trpcManifest.dependencies?.["@trpc/server"]);
assert.ok(trpcManifest.dependencies?.["@trpc/client"]);
assert.ok(trpcManifest.dependencies?.["@trpc/react-query"]);
assert.ok(trpcManifest.dependencies?.["@tanstack/react-query"]);
assert.ok(trpcManifest.dependencies?.["superjson"]);
console.log("✓ tRPC manifest checks passed");

const graphqlManifest = registry.requirePlugin("graphql");
assert.equal(graphqlManifest.category, "developer-experience");
assert.ok(graphqlManifest.dependencies?.["graphql"]);
assert.ok(graphqlManifest.dependencies?.["graphql-yoga"]);
assert.ok(graphqlManifest.dependencies?.["graphql-request"]);
assert.ok(graphqlManifest.devDependencies?.["@graphql-codegen/cli"]);
assert.ok(graphqlManifest.scripts?.["codegen"]);
console.log("✓ GraphQL manifest checks passed");

const supabaseManifest = registry.requirePlugin("supabase");
assert.equal(supabaseManifest.category, "database");
assert.ok(supabaseManifest.dependencies?.["@supabase/supabase-js"]);
assert.ok(supabaseManifest.dependencies?.["@supabase/ssr"]);
assert.ok(supabaseManifest.env?.some((e) => e.key === "NEXT_PUBLIC_SUPABASE_URL"));
assert.ok(supabaseManifest.env?.some((e) => e.key === "NEXT_PUBLIC_SUPABASE_ANON_KEY"));
console.log("✓ Supabase manifest checks passed");




const drizzleManifest = registry.requirePlugin("drizzle");
assert.equal(drizzleManifest.category, "database");
assert.deepEqual(drizzleManifest.conflicts, ["prisma"]);
assert.ok(drizzleManifest.dependencies?.["drizzle-orm"]);
assert.ok(drizzleManifest.dependencies?.["postgres"]);
assert.ok(drizzleManifest.devDependencies?.["drizzle-kit"]);
assert.ok(drizzleManifest.scripts?.["db:generate"]);
assert.ok(drizzleManifest.scripts?.["db:migrate"]);
assert.ok(drizzleManifest.scripts?.["db:push"]);
assert.ok(drizzleManifest.scripts?.["db:studio"]);

console.log("✓ Drizzle manifest checks passed");

// 3. Dependency graph & conflict resolution
const validDrizzleGraph = resolveDependencyGraph(["drizzle"], registry);
assert.equal(validDrizzleGraph.issues.length, 0, "Drizzle standalone should have no issues");
assert.deepEqual(validDrizzleGraph.order, ["drizzle"]);

const conflictGraph = resolveDependencyGraph(["drizzle", "prisma"], registry);
assert.ok(conflictGraph.issues.length > 0, "Drizzle + Prisma must have conflict issue");
assert.ok(
  conflictGraph.issues.some((i) => i.type === "conflict"),
  "Issue must be of type conflict",
);

console.log("✓ Drizzle conflict resolution passed");

// 4. Deployment Provider Registry
import { getDeploymentRegistry } from "../src/deployment/registry.js";
const deployRegistry = getDeploymentRegistry();
assert.ok(deployRegistry.has("vercel"), "Deployment registry must have vercel");
assert.ok(deployRegistry.has("cloudflare"), "Deployment registry must have cloudflare");
assert.ok(deployRegistry.has("railway"), "Deployment registry must have railway");
assert.ok(deployRegistry.has("render"), "Deployment registry must have render");
assert.ok(deployRegistry.has("aws"), "Deployment registry must have aws");
assert.ok(deployRegistry.has("docker"), "Deployment registry must have docker");
assert.equal(deployRegistry.list().length, 6, "Must have 6 deployment providers");
console.log("✓ Deployment registry checks passed");

console.log("ALL UNIT TESTS PASSED");

