import fs from "fs-extra";
import path from "node:path";

import { listAllPluginInfo } from "./generator/pluginInfo.js";
import { getPluginRegistry } from "./plugin/legacyAdapter.js";
import { validatePlugins } from "./plugin/validate.js";
import { initializeProjectConfig, readProjectConfig, readProjectPackage, writeProjectConfig, type NovaProjectConfig } from "./project.js";
import type { FeatureKey } from "./types.js";

export interface ProjectCommandArgs { targetDir: string; rest: string[] }

export function parseProjectCommandArgs(args: string[]): ProjectCommandArgs | { error: string } {
  let targetDir = process.cwd(); const rest: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--path" || args[index] === "-p") {
      if (!args[index + 1]) return { error: "--path requires a directory argument" };
      targetDir = path.resolve(args[++index]);
    } else if (args[index].startsWith("-")) return { error: `Unknown option: ${args[index]}` };
    else rest.push(args[index]);
  }
  return { targetDir, rest };
}

async function project(targetDir: string): Promise<{ pkg: Record<string, unknown>; config: NovaProjectConfig }> {
  const pkg = await readProjectPackage(targetDir);
  const config = (await readProjectConfig(targetDir)) ?? await initializeProjectConfig(targetDir);
  return { pkg, config };
}

export async function initProject(targetDir: string): Promise<NovaProjectConfig> { return initializeProjectConfig(targetDir); }

export async function infoProject(targetDir: string): Promise<string[]> {
  const { pkg, config } = await project(targetDir);
  const deps = { ...((pkg.dependencies as Record<string, string>) ?? {}), ...((pkg.devDependencies as Record<string, string>) ?? {}) };
  return [
    `Project: ${String(pkg.name ?? path.basename(targetDir))}`,
    `Package manager: ${config.packageManager}`,
    `UI library: ${config.uiLibrary}`,
    `Next.js: ${deps.next ?? "not installed"}`,
    `React: ${deps.react ?? "not installed"}`,
    `TypeScript: ${deps.typescript ?? "not installed"}`,
    `Plugins: ${config.plugins.length ? config.plugins.join(", ") : "none"}`,
  ];
}

export async function validateProject(targetDir: string): Promise<string[]> {
  const { pkg, config } = await project(targetDir);
  const registry = getPluginRegistry();
  const issues = validatePlugins(config.plugins, registry, { projectName: String(pkg.name ?? path.basename(targetDir)), packageManager: config.packageManager, uiLibrary: config.uiLibrary, enabledPlugins: config.plugins, answers: {} });
  return issues.flatMap((issue) => issue.errors.map((error) => `${issue.plugin}: ${error}`));
}

export async function doctorProject(targetDir: string): Promise<{ errors: string[]; warnings: string[] }> {
  const { pkg, config } = await project(targetDir); const errors: string[] = []; const warnings: string[] = [];
  const required = ["next", "react", "react-dom"];
  const deps = { ...((pkg.dependencies as Record<string, string>) ?? {}), ...((pkg.devDependencies as Record<string, string>) ?? {}) };
  for (const name of required) if (!deps[name]) errors.push(`Missing required dependency: ${name}`);
  const requiredNode = 18;
  const major = Number(process.versions.node.split(".")[0]);
  if (major < requiredNode) errors.push(`Node.js ${requiredNode}+ is required; found ${process.versions.node}.`);
  if (!await fs.pathExists(path.join(targetDir, "tsconfig.json"))) warnings.push("Missing tsconfig.json.");
  if (!await fs.pathExists(path.join(targetDir, ".env.example"))) warnings.push("Missing .env.example.");
  const validation = await validateProject(targetDir); errors.push(...validation);
  if (config.packageManager === "npm" && !await fs.pathExists(path.join(targetDir, "package-lock.json"))) warnings.push("No package-manager lockfile found.");
  return { errors, warnings };
}

export async function removePlugins(targetDir: string, requested: string[], force = false): Promise<{ removed: FeatureKey[]; skipped: string[] }> {
  const { pkg, config } = await project(targetDir); const removed: FeatureKey[] = []; const skipped: string[] = [];
  for (const id of requested) {
    if (!config.plugins.includes(id as FeatureKey)) { skipped.push(id); continue; }
    const requiredBy = config.plugins.filter((plugin) => getPluginRegistry().getPlugin(plugin)?.requires?.includes(id));
    if (requiredBy.length && !force) throw new Error(`Cannot remove "${id}" because it is required by ${requiredBy.join(", ")}. Remove dependents first or use --force.`);
    removed.push(id as FeatureKey);
  }
  if (!removed.length) return { removed, skipped };
  const remaining = config.plugins.filter((plugin) => !removed.includes(plugin));
  for (const plugin of removed) {
    const manifest = getPluginRegistry().getPlugin(plugin);
    for (const name of Object.keys(manifest?.dependencies ?? {})) delete (pkg.dependencies as Record<string, string> | undefined)?.[name];
    for (const name of Object.keys(manifest?.devDependencies ?? {})) delete (pkg.devDependencies as Record<string, string> | undefined)?.[name];
    for (const name of Object.keys(manifest?.scripts ?? {})) delete (pkg.scripts as Record<string, string> | undefined)?.[name];
  }
  await fs.writeJson(path.join(targetDir, "package.json"), pkg, { spaces: 2 });
  await writeProjectConfig(targetDir, { ...config, plugins: remaining });
  return { removed, skipped };
}

export function listPlugins(query?: string): ReturnType<typeof listAllPluginInfo> {
  const needle = query?.toLowerCase();
  return listAllPluginInfo().filter((plugin) => !needle || [plugin.key, plugin.folder, plugin.metadata.name, plugin.metadata.description, getPluginRegistry().getPlugin(plugin.key)?.category].join(" ").toLowerCase().includes(needle));
}

export async function cleanProject(targetDir: string, dryRun = false): Promise<string[]> {
  await readProjectPackage(targetDir); const candidates = [".next", ".turbo", "node_modules/.cache", ".nova/cache"];
  const found: string[] = [];
  for (const relative of candidates) { const absolute = path.join(targetDir, relative); if (await fs.pathExists(absolute)) { found.push(relative); if (!dryRun) await fs.remove(absolute); } }
  return found;
}

export async function diffProject(targetDir: string): Promise<string[]> {
  const { config } = await project(targetDir); const findings: string[] = [];
  for (const plugin of config.plugins) if (!getPluginRegistry().has(plugin)) findings.push(`Deprecated or unavailable plugin metadata: ${plugin}`);
  if (!await fs.pathExists(path.join(targetDir, ".env.example"))) findings.push("Missing template baseline file: .env.example");
  return findings;
}

/** Reconciles dependency declarations with the installed plugin manifests;
 * it deliberately never overwrites project source/configuration files. */
export async function upgradeProject(targetDir: string): Promise<string[]> {
  const { pkg, config } = await project(targetDir); const updates: string[] = [];
  const dependencies = (pkg.dependencies as Record<string, string> | undefined) ?? (pkg.dependencies = {} as Record<string, string>);
  const devDependencies = (pkg.devDependencies as Record<string, string> | undefined) ?? (pkg.devDependencies = {} as Record<string, string>);
  for (const id of config.plugins) {
    const plugin = getPluginRegistry().getPlugin(id);
    for (const [name, version] of Object.entries(plugin?.dependencies ?? {})) if (dependencies[name] !== version) { dependencies[name] = version; updates.push(name); }
    for (const [name, version] of Object.entries(plugin?.devDependencies ?? {})) if (devDependencies[name] !== version) { devDependencies[name] = version; updates.push(name); }
  }
  if (updates.length) await fs.writeJson(path.join(targetDir, "package.json"), pkg, { spaces: 2 });
  return updates;
}

/** Repairs only deterministic metadata drift. Source changes remain opt-in. */
export async function repairProject(targetDir: string): Promise<string[]> {
  const { config } = await project(targetDir); const repaired: string[] = [];
  if (!await fs.pathExists(path.join(targetDir, ".env.example"))) { await fs.writeFile(path.join(targetDir, ".env.example"), "# Environment variables\n", "utf8"); repaired.push(".env.example"); }
  await writeProjectConfig(targetDir, config); repaired.push(".nova.json");
  return repaired;
}
