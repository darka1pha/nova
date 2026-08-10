import fs from "fs-extra";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { PackageManager } from "@nova/core";

import { resolveFeatureKey } from "./addonRegistry.js";
import type { FeatureKey, UiLibrary } from "./types.js";

export const NOVA_DIR = ".nova";
export const NOVA_MANIFEST_FILE = path.join(NOVA_DIR, "project.json");
export const LEGACY_NOVA_CONFIG_FILE = ".nova.json";
export const NOVA_CONFIG_FILE = LEGACY_NOVA_CONFIG_FILE;

export interface NovaProjectManifest {
  $schema: "https://nova.dev/schema/project.json";
  version: 1;
  schemaVersion?: number;
  name?: string;
  novaVersion?: string;
  createdAt?: string;
  updatedAt?: string;
  packageManager: PackageManager;
  uiLibrary: UiLibrary;
  projectType: "nextjs" | "react-native" | "expo";
  template?: string;
  preset?: string;
  plugins: FeatureKey[];
  pluginVersions?: Record<string, string>;
  customMetadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export type NovaProjectConfig = NovaProjectManifest;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getNovaCliVersion(): string {
  try {
    const pkgPath = path.resolve(__dirname, "..", "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = fs.readJsonSync(pkgPath) as { version?: string };
      return pkg.version ?? "1.0.0";
    }
  } catch {
    // Fallback if running from bundle or test environment
  }
  return "1.0.0";
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
  const deps = {
    ...((pkg.dependencies as Record<string, string>) ?? {}),
    ...((pkg.devDependencies as Record<string, string>) ?? {}),
  };
  if (deps["@mui/material"]) return "mui";
  if (deps["@chakra-ui/react"]) return "chakra";
  if (deps.antd) return "ant";
  if (deps["@mantine/core"]) return "mantine";
  if (deps["@nextui-org/react"]) return "hero";
  if (deps.daisyui) return "daisy";
  if (deps["@headlessui/react"]) return "headless";
  return "shadcn";
}

export function detectProjectType(pkg: Record<string, unknown>): "nextjs" | "react-native" | "expo" {
  const deps = {
    ...((pkg.dependencies as Record<string, string>) ?? {}),
    ...((pkg.devDependencies as Record<string, string>) ?? {}),
  };
  if (deps["expo"]) return "react-native";
  if (deps["react-native"]) return "react-native";
  return "nextjs";
}

/**
 * Deterministically migrates any raw manifest data to the latest schema (schemaVersion 1),
 * preserving customMetadata and any unknown fields without data loss.
 */
export function migrateManifest(raw: unknown, defaultDirName = "app"): NovaProjectManifest {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      $schema: "https://nova.dev/schema/project.json",
      version: 1,
      schemaVersion: 1,
      name: defaultDirName,
      novaVersion: getNovaCliVersion(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      packageManager: "npm",
      uiLibrary: "shadcn",
      projectType: "nextjs",
      plugins: [],
      pluginVersions: {},
    };
  }

  const obj = raw as Record<string, unknown>;
  const rawPlugins = Array.isArray(obj.plugins) ? obj.plugins : [];
  const plugins = resolveKnownFeatures(rawPlugins.map(String));
  const rawPluginVersions = typeof obj.pluginVersions === "object" && obj.pluginVersions !== null
    ? (obj.pluginVersions as Record<string, string>)
    : {};

  const pluginVersions: Record<string, string> = { ...rawPluginVersions };
  for (const plugin of plugins) {
    if (!pluginVersions[plugin]) {
      pluginVersions[plugin] = "1.0.0";
    }
  }

  const result: NovaProjectManifest = {
    ...obj,
    $schema: "https://nova.dev/schema/project.json",
    version: 1,
    schemaVersion: 1,
    name: typeof obj.name === "string" ? obj.name : defaultDirName,
    novaVersion: typeof obj.novaVersion === "string" ? obj.novaVersion : getNovaCliVersion(),
    createdAt: typeof obj.createdAt === "string" ? obj.createdAt : new Date().toISOString(),
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : new Date().toISOString(),
    packageManager: (["npm", "pnpm", "yarn", "bun"].includes(obj.packageManager as string)
      ? obj.packageManager
      : "npm") as PackageManager,
    uiLibrary: (["shadcn", "mui", "chakra", "ant", "mantine", "hero", "daisy", "headless"].includes(obj.uiLibrary as string)
      ? obj.uiLibrary
      : "shadcn") as UiLibrary,
    projectType: (["nextjs", "react-native", "expo"].includes(obj.projectType as string)
      ? obj.projectType
      : "nextjs") as "nextjs" | "react-native" | "expo",
    ...(typeof obj.template === "string" ? { template: obj.template } : {}),
    ...(typeof obj.preset === "string" ? { preset: obj.preset } : {}),
    plugins: [...new Set(plugins)].sort(),
    pluginVersions,
  };

  return result;
}

/**
 * Reads project manifest from `.nova/project.json` or fallback `.nova.json`.
 */
export async function readProjectConfig(targetDir: string): Promise<NovaProjectConfig | undefined> {
  const primaryPath = path.join(targetDir, NOVA_MANIFEST_FILE);
  if (await fs.pathExists(primaryPath)) {
    try {
      const raw = await fs.readJson(primaryPath);
      return migrateManifest(raw, path.basename(targetDir));
    } catch {
      // Fall through to legacy check if JSON corrupted
    }
  }

  const legacyPath = path.join(targetDir, LEGACY_NOVA_CONFIG_FILE);
  if (await fs.pathExists(legacyPath)) {
    try {
      const raw = await fs.readJson(legacyPath);
      return migrateManifest(raw, path.basename(targetDir));
    } catch {
      return undefined;
    }
  }

  return undefined;
}

/**
 * Writes the authoritative project manifest to `.nova/project.json` and syncs `.nova.json`.
 */
export async function writeProjectConfig(targetDir: string, config: NovaProjectConfig): Promise<void> {
  const now = new Date().toISOString();
  const pkgData = await readProjectPackage(targetDir).catch(() => ({} as Record<string, unknown>));
  const pkgName = typeof pkgData.name === "string" ? pkgData.name : undefined;

  const plugins = [...new Set(config.plugins)].sort();
  const pluginVersions: Record<string, string> = { ...(config.pluginVersions ?? {}) };
  for (const plugin of plugins) {
    if (!pluginVersions[plugin]) {
      pluginVersions[plugin] = "1.0.0";
    }
  }

  const normalizedConfig: NovaProjectConfig = {
    ...config,
    $schema: "https://nova.dev/schema/project.json",
    version: 1,
    schemaVersion: 1,
    name: config.name ?? pkgName ?? path.basename(targetDir),
    novaVersion: config.novaVersion ?? getNovaCliVersion(),
    createdAt: config.createdAt ?? now,
    updatedAt: now,
    packageManager: config.packageManager,
    uiLibrary: config.uiLibrary,
    projectType: config.projectType ?? "nextjs",
    ...(config.template ? { template: config.template } : {}),
    ...(config.preset ? { preset: config.preset } : {}),
    plugins,
    pluginVersions,
    ...(config.customMetadata ? { customMetadata: config.customMetadata } : {}),
  };

  const novaDir = path.join(targetDir, NOVA_DIR);
  await fs.ensureDir(novaDir);
  await fs.writeJson(path.join(targetDir, NOVA_MANIFEST_FILE), normalizedConfig, { spaces: 2 });

  // Sync legacy .nova.json for backwards compatibility
  await fs.writeJson(path.join(targetDir, LEGACY_NOVA_CONFIG_FILE), normalizedConfig, { spaces: 2 });
}

/** Establishes project metadata without modifying generated source files. */
export async function initializeProjectConfig(
  targetDir: string,
  plugins: FeatureKey[] = [],
  overrides: Partial<Pick<NovaProjectConfig, "packageManager" | "uiLibrary" | "projectType" | "name" | "template" | "preset">> = {},
): Promise<NovaProjectConfig> {
  const pkg = await readProjectPackage(targetDir);
  const existing = await readProjectConfig(targetDir);
  const now = new Date().toISOString();

  const config: NovaProjectConfig = existing ?? {
    $schema: "https://nova.dev/schema/project.json",
    version: 1,
    schemaVersion: 1,
    name: overrides.name ?? String(pkg.name ?? path.basename(targetDir)),
    novaVersion: getNovaCliVersion(),
    createdAt: now,
    updatedAt: now,
    packageManager: overrides.packageManager ?? await detectProjectPackageManager(targetDir),
    uiLibrary: overrides.uiLibrary ?? detectProjectUiLibrary(pkg),
    projectType: overrides.projectType ?? detectProjectType(pkg),
    template: overrides.template,
    preset: overrides.preset,
    plugins,
    pluginVersions: {},
  };

  if (overrides.name) config.name = overrides.name;
  if (overrides.packageManager) config.packageManager = overrides.packageManager;
  if (overrides.uiLibrary) config.uiLibrary = overrides.uiLibrary;
  if (overrides.projectType) config.projectType = overrides.projectType;
  if (overrides.template) config.template = overrides.template;
  if (overrides.preset) config.preset = overrides.preset;
  if (plugins.length) config.plugins = [...new Set([...config.plugins, ...plugins])];

  config.schemaVersion = 1;
  config.pluginVersions = config.pluginVersions || {};
  for (const p of config.plugins) {
    if (!config.pluginVersions[p]) {
      config.pluginVersions[p] = "1.0.0";
    }
  }

  await writeProjectConfig(targetDir, config);
  return config;
}

export function resolveKnownFeatures(values: string[]): FeatureKey[] {
  return values.map(resolveFeatureKey).filter((value): value is FeatureKey => Boolean(value));
}
