import fs from "fs-extra";
import path from "node:path";

export interface PackageAdditions {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export interface MergePackageResult {
  addedDependencies: string[];
  addedDevDependencies: string[];
  addedScripts: string[];
  skippedScripts: string[];
}

function sortKeys<T extends Record<string, string>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b))) as T;
}

/**
 * Merges one feature's dependency/script additions into an existing
 * project's package.json (in memory - caller writes it back). Dependencies
 * and devDependencies are always added/updated (the addon's pinned version
 * wins on conflict); scripts are only added when the key doesn't already
 * exist, so a project's customized script is never silently overwritten.
 */
export function mergePackageAdditions(
  pkg: Record<string, unknown>,
  additions: PackageAdditions,
  options: { dryRun?: boolean } = {},
): MergePackageResult {
  const result: MergePackageResult = {
    addedDependencies: [],
    addedDevDependencies: [],
    addedScripts: [],
    skippedScripts: [],
  };

  const dependencies = { ...((pkg.dependencies as Record<string, string> | undefined) ?? {}) };
  const devDependencies = {
    ...((pkg.devDependencies as Record<string, string> | undefined) ?? {}),
  };
  const scripts = { ...((pkg.scripts as Record<string, string> | undefined) ?? {}) };

  for (const [name, version] of Object.entries(additions.dependencies ?? {})) {
    if (dependencies[name] !== version) result.addedDependencies.push(name);
    dependencies[name] = version;
  }

  for (const [name, version] of Object.entries(additions.devDependencies ?? {})) {
    if (devDependencies[name] !== version) result.addedDevDependencies.push(name);
    devDependencies[name] = version;
  }

  for (const [name, command] of Object.entries(additions.scripts ?? {})) {
    if (scripts[name]) {
      result.skippedScripts.push(name);
      continue;
    }
    scripts[name] = command;
    result.addedScripts.push(name);
  }

  if (!options.dryRun) {
    pkg.dependencies = sortKeys(dependencies);
    pkg.devDependencies = sortKeys(devDependencies);
    pkg.scripts = scripts;
  }

  return result;
}

export async function readPackageJson(targetDir: string): Promise<Record<string, unknown>> {
  const pkgPath = path.join(targetDir, "package.json");
  if (!(await fs.pathExists(pkgPath))) {
    throw new Error(
      `No package.json found in "${targetDir}". "nova add" only works inside an existing Node/Next.js project.`,
    );
  }
  return fs.readJson(pkgPath);
}

export async function writePackageJson(targetDir: string, pkg: Record<string, unknown>) {
  await fs.writeJson(path.join(targetDir, "package.json"), pkg, { spaces: 2 });
}