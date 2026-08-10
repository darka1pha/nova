import fs from "fs-extra";
import path from "node:path";
import { validatePluginPackage } from "./validator.js";
import type { PluginResolutionContext } from "../plugin/types.js";

export interface PluginTestResult {
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  errors: string[];
  logs: string[];
}

export async function testPluginPackage(pluginDir: string): Promise<PluginTestResult> {
  const errors: string[] = [];
  const logs: string[] = [];
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  const recordTest = (name: string, ok: boolean, errMsg?: string) => {
    totalTests += 1;
    if (ok) {
      passedTests += 1;
      logs.push(`✓ ${name}`);
    } else {
      failedTests += 1;
      errors.push(`${name}: ${errMsg ?? "failed"}`);
      logs.push(`✖ ${name}: ${errMsg ?? "failed"}`);
    }
  };

  // Test 1: Static validation
  const validation = await validatePluginPackage(pluginDir);
  recordTest("Manifest validation", validation.valid, validation.errors.join(", "));

  if (!validation.manifest) {
    return {
      passed: false,
      totalTests,
      passedTests,
      failedTests,
      errors,
      logs,
    };
  }

  const manifest = validation.manifest;

  // Test 2: Dependency syntax check
  let depsValid = true;
  for (const [dep, ver] of Object.entries(manifest.dependencies ?? {})) {
    if (typeof ver !== "string" || !ver.trim()) {
      depsValid = false;
      break;
    }
  }
  recordTest("Dependencies format", depsValid, "Malformed dependencies map");

  // Test 3: Environment variables check
  let envValid = true;
  for (const env of manifest.env ?? []) {
    if (!env.key || typeof env.key !== "string") {
      envValid = false;
      break;
    }
  }
  recordTest("Environment variable declarations", envValid, "Invalid env variable key");

  // Test 4: Lifecycle simulation test
  const mockContext: PluginResolutionContext = {
    projectName: "test-app",
    packageManager: "pnpm",
    uiLibrary: "shadcn",
    enabledPlugins: [manifest.id],
    answers: {},
  };

  if (manifest.validate) {
    try {
      const res = manifest.validate(mockContext);
      const ok = res ? res.ok : true;
      recordTest("Plugin validate() hook execution", ok, res?.errors.join(", "));
    } catch (e) {
      recordTest("Plugin validate() hook execution", false, e instanceof Error ? e.message : String(e));
    }
  }

  // Test 5: Verify test files in tests/ directory if present
  const testsDir = path.join(pluginDir, "tests");
  if (await fs.pathExists(testsDir)) {
    const files = await fs.readdir(testsDir);
    recordTest("Plugin test suite files", files.length > 0, "tests/ directory is empty");
  }

  return {
    passed: failedTests === 0,
    totalTests,
    passedTests,
    failedTests,
    errors,
    logs,
  };
}
