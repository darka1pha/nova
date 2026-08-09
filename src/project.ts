import fs from "fs-extra";
import path from "node:path";

import type { PackageManager } from "@nova/core";

import { resolveFeatureKey } from "./addonRegistry.js";
import type { FeatureKey, UiLibrary } from "./types.js";

export const NOVA_CONFIG_FILE = ".nova.json";

export interface NovaProjectConfig {
  $schema: "https://nova.dev/schema/project.json";
  version: 1;
  packageManager: PackageManager;
  uiLibrary: UiLibrary;
  projectType?: "nextjs" | "react-native" | "expo";
  plugins: FeatureKey[];
}

export class ProjectNotFoundError extends Error {
  constructor(targetDir: string) {
    super(`No package.json found in "${targetDir}". Run this command from a project root or pass --path <dir>.`);
    this.name = "ProjectNotFoundError";
  }
}

export async function readProjectPackage(targetDir: string): Promise<Record<string, unknown>> {
  const packagePath = path.join(targetDir, "package.json");
  if (!(await fs.pathExists(packagePath))) throw new ProjectNotFoundError(targetDir);
  return fs.readJson(packagePath);
}

export async function detectProjectPackageManager(targetDir: string): Promise<PackageManager> {
  if (await fs.pathExists(path.join(targetDir, "pnpm-lock.yaml"))) return "pnpm";
  if (await fs.pathExists(path.join(targetDir, "yarn.lock"))) return "yarn";
  if (await fs.pathExists(path.join(targetDir, "bun.lockb"))) return "bun";
  return "npm";
}

export function detectProjectUiLibrary(pkg: Record<string, unknown>): UiLibrary {
  const deps = { ...((pkg.dependencies as Record<string, string>) ?? {}), ...((pkg.devDependencies as Record<string, string>) ?? {}) };
  if (deps["@mui/material"]) return "mui";
  if (deps["@chakra-ui/react"]) return "chakra";
  if (deps.antd) return "ant";
  if (deps["@mantine/core"]) return "mantine";
  if (deps["@nextui-org/react"]) return "hero";
  if (deps.daisyui) return "daisy";
  if (deps["@headlessui/react"]) return "headless";
  return "shadcn";
}

export async function readProjectConfig(targetDir: string): Promise<NovaProjectConfig | undefined> {
  const configPath = path.join(targetDir, NOVA_CONFIG_FILE);
  if (!(await fs.pathExists(configPath))) return undefined;
  return fs.readJson(configPath) as Promise<NovaProjectConfig>;
}

export async function writeProjectConfig(targetDir: string, config: NovaProjectConfig): Promise<void> {
  await fs.writeJson(path.join(targetDir, NOVA_CONFIG_FILE), { ...config, plugins: [...new Set(config.plugins)].sort() }, { spaces: 2 });
}

/** Establishes project metadata without modifying generated source files. */
export async function initializeProjectConfig(
  targetDir: string,
  plugins: FeatureKey[] = [],
  overrides: Partial<Pick<NovaProjectConfig, "packageManager" | "uiLibrary" | "projectType">> = {},
): Promise<NovaProjectConfig> {
  const pkg = await readProjectPackage(targetDir);
  const existing = await readProjectConfig(targetDir);
  const config: NovaProjectConfig = existing ?? {
    $schema: "https://nova.dev/schema/project.json",
    version: 1,
    packageManager: overrides.packageManager ?? await detectProjectPackageManager(targetDir),
    uiLibrary: overrides.uiLibrary ?? detectProjectUiLibrary(pkg),
    projectType: overrides.projectType ?? (pkg.dependencies && "expo" in (pkg.dependencies as Record<string, unknown>) ? "react-native" : "nextjs"),
    plugins,
  };
  if (overrides.packageManager) config.packageManager = overrides.packageManager;
  if (overrides.uiLibrary) config.uiLibrary = overrides.uiLibrary;
  if (overrides.projectType) config.projectType = overrides.projectType;
  if (plugins.length) config.plugins = [...new Set([...config.plugins, ...plugins])];
  await writeProjectConfig(targetDir, config);
  return config;
}


export function resolveKnownFeatures(values: string[]): FeatureKey[] {
  return values.map(resolveFeatureKey).filter((value): value is FeatureKey => Boolean(value));
}
