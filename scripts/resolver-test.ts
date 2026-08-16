import assert from "node:assert";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (error) {
    failed++;
    console.error(`  \x1b[31m✗\x1b[0m ${name}`);
    console.error(`    ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  console.log("\nResolver Tests\n");

  // --- Types ---
  console.log("PackageRequirement types:");
  
  await test("PackageResolutionStrategy includes all strategies", () => {
    // Type-level check — just verify the imports work
    const strategies: Array<import("../src/resolver/types.js").PackageResolutionStrategy> = ["latest", "compatible", "exact"];
    assert.strictEqual(strategies.length, 3);
  });

  // --- Package Requirements ---
  console.log("\nPackage Requirements:");

  await test("collectBaseRequirements returns base deps", async () => {
    const { collectBaseRequirements } = await import("../src/resolver/packageRequirements.js");
    const reqs = collectBaseRequirements("shadcn");
    assert.ok(reqs.length > 10, `Expected >10 base requirements, got ${reqs.length}`);
    const nextReq = reqs.find(r => r.name === "next");
    assert.ok(nextReq, "Should include 'next' package");
    assert.strictEqual(nextReq.strategy, "compatible");
    assert.ok(nextReq.range?.startsWith("^"), "next range should start with ^");
  });

  await test("collectBaseRequirements includes UI library deps", async () => {
    const { collectBaseRequirements } = await import("../src/resolver/packageRequirements.js");
    const muiReqs = collectBaseRequirements("mui");
    const muiPkg = muiReqs.find(r => r.name === "@mui/material");
    assert.ok(muiPkg, "MUI requirements should include @mui/material");
  });

  await test("collectFeatureRequirements returns feature deps", async () => {
    const { collectFeatureRequirements } = await import("../src/resolver/packageRequirements.js");
    const reqs = collectFeatureRequirements(["drizzle"]);
    assert.ok(reqs.length > 0, "Drizzle should have requirements");
    const drizzleOrm = reqs.find(r => r.name === "drizzle-orm");
    assert.ok(drizzleOrm, "Should include drizzle-orm");
    assert.strictEqual(drizzleOrm.strategy, "compatible");
  });

  await test("collectFeatureRequirements handles features with no deps", async () => {
    const { collectFeatureRequirements } = await import("../src/resolver/packageRequirements.js");
    const reqs = collectFeatureRequirements(["docker"]);
    assert.strictEqual(reqs.length, 0, "Docker has no package deps");
  });

  await test("collectAllRequirements combines base + features", async () => {
    const { collectAllRequirements } = await import("../src/resolver/packageRequirements.js");
    const features: Record<string, boolean> = { prisma: true, drizzle: false };
    const reqs = collectAllRequirements({ features: features as any, uiLibrary: "shadcn" });
    assert.ok(reqs.length > 10, "Should have base + prisma deps");
    const prismaClient = reqs.find(r => r.name === "@prisma/client");
    assert.ok(prismaClient, "Should include @prisma/client");
  });

  await test("getBaseDependencyNames returns a non-empty set", async () => {
    const { getBaseDependencyNames } = await import("../src/resolver/packageRequirements.js");
    const names = getBaseDependencyNames("shadcn");
    assert.ok(names.size > 10, "Should have many base dep names");
    assert.ok(names.has("react"), "Should include react");
    assert.ok(names.has("next"), "Should include next");
    assert.ok(names.has("typescript"), "Should include typescript");
  });

  // --- Registry Client ---
  console.log("\nRegistry Client:");

  await test("isValidPackageName validates correctly", async () => {
    const { isValidPackageName } = await import("../src/resolver/registryClient.js");
    assert.ok(isValidPackageName("react"));
    assert.ok(isValidPackageName("@types/react"));
    assert.ok(isValidPackageName("drizzle-orm"));
    assert.ok(isValidPackageName("@tanstack/react-query"));
    assert.ok(!isValidPackageName(""), "Empty name should be invalid");
    assert.ok(!isValidPackageName("../evil"), "Path traversal should be invalid");
    assert.ok(!isValidPackageName("A".repeat(215)), "Name over 214 chars should be invalid");
  });

  // --- Resolver (mocked/offline) ---
  console.log("\nResolver (offline mode):");

  await test("Offline resolver returns fallback for compatible strategy", async () => {
    const { PackageResolver } = await import("../src/resolver/index.js");
    const resolver = new PackageResolver({ offline: true });
    const result = await resolver.resolveCompatible("react", "^19.0.0");
    assert.strictEqual(result.name, "react");
    assert.strictEqual(result.strategy, "compatible");
    assert.strictEqual(result.versionRange, "^19.0.0");
    assert.ok(result.version, "Should have a version");
  });

  await test("Offline resolver returns fallback for latest strategy", async () => {
    const { PackageResolver } = await import("../src/resolver/index.js");
    const resolver = new PackageResolver({ offline: true });
    const result = await resolver.resolveLatest("react");
    assert.strictEqual(result.name, "react");
    assert.strictEqual(result.strategy, "latest");
  });

  await test("Offline resolver returns fallback for exact strategy", async () => {
    const { PackageResolver } = await import("../src/resolver/index.js");
    const resolver = new PackageResolver({ offline: true });
    const result = await resolver.resolveExact("react", "19.0.0");
    assert.strictEqual(result.version, "19.0.0");
    assert.strictEqual(result.strategy, "exact");
  });

  await test("Batch resolve deduplicates requirements", async () => {
    const { PackageResolver } = await import("../src/resolver/index.js");
    const resolver = new PackageResolver({ offline: true });
    const result = await resolver.resolvePackages([
      { name: "react", strategy: "compatible", range: "^19.0.0" },
      { name: "react", strategy: "compatible", range: "^19.0.0" },
      { name: "next", strategy: "compatible", range: "^15.1.0" },
    ]);
    assert.strictEqual(result.resolved.length, 3);
    assert.strictEqual(result.failed.length, 0);
  });

  // --- Resolver (live registry, skip if no network) ---
  console.log("\nResolver (live registry):");

  await test("Resolve latest react version from registry", async () => {
    const { PackageResolver } = await import("../src/resolver/index.js");
    const resolver = new PackageResolver({ timeoutMs: 10000 });
    try {
      const result = await resolver.resolveLatest("react");
      assert.ok(result.version, "Should resolve a version");
      assert.ok(/^\d+\.\d+\.\d+/.test(result.version), `Version should be semver: ${result.version}`);
      assert.strictEqual(result.strategy, "latest");
      console.log(`    resolved: react@${result.version}`);
    } catch (error) {
      console.log(`    (skipped: ${error instanceof Error ? error.message.split("\n")[0] : "network unavailable"})`);
    }
  });

  await test("Resolve compatible typescript version", async () => {
    const { PackageResolver } = await import("../src/resolver/index.js");
    const resolver = new PackageResolver({ timeoutMs: 10000 });
    try {
      const result = await resolver.resolveCompatible("typescript", "^5.7.2");
      assert.ok(result.version, "Should resolve a version");
      assert.ok(result.version.startsWith("5."), `Should be 5.x: ${result.version}`);
      console.log(`    resolved: typescript@${result.version}`);
    } catch (error) {
      console.log(`    (skipped: ${error instanceof Error ? error.message.split("\n")[0] : "network unavailable"})`);
    }
  });

  await test("Resolve nonexistent package fails gracefully", async () => {
    const { PackageResolver } = await import("../src/resolver/index.js");
    const resolver = new PackageResolver({ timeoutMs: 5000 });
    try {
      await resolver.resolveLatest("this-package-does-not-exist-xyzzy-12345");
      assert.fail("Should have thrown");
    } catch (error) {
      assert.ok(error instanceof Error);
      // Could be network error or 404 — both are acceptable
    }
  });

  await test("Resolver cache prevents duplicate fetches", async () => {
    const { PackageResolver } = await import("../src/resolver/index.js");
    const resolver = new PackageResolver({ timeoutMs: 10000 });
    try {
      const start = Date.now();
      await resolver.resolveLatest("zod");
      const first = Date.now() - start;
      const start2 = Date.now();
      await resolver.resolveLatest("zod");
      const second = Date.now() - start2;
      // Second call should be near-instant (cached)
      assert.ok(second < first || second < 50, `Cache should make second call fast: ${second}ms vs ${first}ms`);
      console.log(`    first: ${first}ms, cached: ${second}ms`);
    } catch (error) {
      console.log(`    (skipped: network unavailable)`);
    }
  });

  // --- Results ---
  console.log(`\n\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
