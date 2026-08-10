import fs from "fs-extra";
import path from "node:path";
import type { PluginManifest } from "../plugin/types.js";
import { isValidPluginId, validatePluginSecurity } from "../registry/index.js";

export interface PluginValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
  manifest?: PluginManifest;
  checks: Array<{ name: string; passed: boolean; message?: string }>;
}

export async function validatePluginPackage(pluginDir: string): Promise<PluginValidationReport> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checks: Array<{ name: string; passed: boolean; message?: string }> = [];

  const addCheck = (name: string, passed: boolean, message?: string) => {
    checks.push({ name, passed, message });
    if (!passed && message) {
      errors.push(message);
    }
  };

  // 1. Check directory
  if (!(await fs.pathExists(pluginDir))) {
    return {
      valid: false,
      errors: [`Plugin directory does not exist: "${pluginDir}"`],
      warnings: [],
      checks: [{ name: "Directory Exists", passed: false, message: "Directory not found" }],
    };
  }

  // 2. Read package.json / manifest
  const pkgPath = path.join(pluginDir, "package.json");
  const manifestPath = path.join(pluginDir, "nova-plugin.json");
  const srcManifestPath = path.join(pluginDir, "src", "manifest.ts");

  let manifest: PluginManifest | undefined;

  if (await fs.pathExists(manifestPath)) {
    try {
      manifest = await fs.readJson(manifestPath);
      addCheck("Manifest File", true);
    } catch (e) {
      addCheck("Manifest File", false, `Failed to parse nova-plugin.json: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else if (await fs.pathExists(pkgPath)) {
    try {
      const pkg = await fs.readJson(pkgPath);
      if (pkg.novaPlugin) {
        manifest = {
          id: pkg.novaPlugin.id ?? pkg.name,
          name: pkg.novaPlugin.name ?? pkg.name,
          version: pkg.version ?? "0.1.0",
          description: pkg.description ?? "",
          category: pkg.novaPlugin.category ?? "developer-experience",
          ...pkg.novaPlugin,
        };
        addCheck("Manifest in package.json", true);
      } else if (await fs.pathExists(srcManifestPath)) {
        // Source plugin project
        manifest = {
          id: pkg.name ?? path.basename(pluginDir),
          name: pkg.name ?? path.basename(pluginDir),
          version: pkg.version ?? "0.1.0",
          description: pkg.description ?? "",
          category: "developer-experience",
        };
        addCheck("TypeScript Source Manifest", true);
      } else {
        addCheck("Manifest Definition", false, "No novaPlugin field in package.json or nova-plugin.json found");
      }
    } catch (e) {
      addCheck("package.json", false, `Failed to read package.json: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    addCheck("Package Metadata", false, "Neither package.json nor nova-plugin.json found");
  }

  if (!manifest) {
    return {
      valid: false,
      errors,
      warnings,
      checks,
    };
  }

  // 3. Plugin ID
  const isIdValid = isValidPluginId(manifest.id);
  addCheck("Plugin ID", isIdValid, isIdValid ? undefined : `Invalid plugin ID "${manifest.id}"`);

  // 4. Version
  const hasVersion = Boolean(manifest.version && typeof manifest.version === "string");
  addCheck("Version", hasVersion, hasVersion ? undefined : "Missing plugin version string");

  // 5. Compatibility
  const hasCompatibility = Boolean(manifest.compatibility?.nova || true);
  addCheck("Compatibility", hasCompatibility);

  // 6. Security & Traversal check
  const security = validatePluginSecurity(manifest, pluginDir);
  for (const err of security.errors) {
    errors.push(err);
  }
  for (const warn of security.warnings) {
    warnings.push(warn);
  }
  addCheck("Security & Path Boundaries", security.valid, security.errors.join("; "));

  // 7. Check templates directory if specified
  if (manifest.templates) {
    for (const t of manifest.templates) {
      const resolvedTpl = path.resolve(pluginDir, t.src);
      if (!(await fs.pathExists(resolvedTpl))) {
        warnings.push(`Declared template path does not exist on disk: "${t.src}"`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    manifest,
    checks,
  };
}
