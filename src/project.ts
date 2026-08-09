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
  name?: string;
  novaVersion?: string;
  createdAt?: string;
  updatedAt?: string;
  packageManager: PackageManager;
  uiLibrary: UiLibrary;
  projectType: "nextjs" | "react-native" | "expo";
  plugins: FeatureKey[];
  customMetadata?: Record<string, unknown>;
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
 * Reads project manifest from `.nova/project.json` or fallback `.nova.json`.
 */
export async function readProjectConfig(targetDir: string): Promise<NovaProjectConfig | undefined> {
  const primaryPath = path.join(targetDir, NOVA_MANIFEST_FILE);
  if (await fs.pathExists(primaryPath)) {
    try {
      return (await fs.readJson(primaryPath)) as NovaProjectConfig;
    } catch {
      // Fall through to legacy check if JSON corrupted
    }
  }

  const legacyPath = path.join(targetDir, LEGACY_NOVA_CONFIG_FILE);
  if (await fs.pathExists(legacyPath)) {
    try {
      return (await fs.readJson(legacyPath)) as NovaProjectConfig;
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
  const normalizedConfig: NovaProjectConfig = {
    $schema: "https://nova.dev/schema/project.json",
    version: 1,
    name: config.name ?? (await readProjectPackage(targetDir).catch(() => ({}))).name as string | undefined ?? path.basename(targetDir),
    novaVersion: config.novaVersion ?? getNovaCliVersion(),
    createdAt: config.createdAt ?? now,
    updatedAt: now,
    packageManager: config.packageManager,
    uiLibrary: config.uiLibrary,
    projectType: config.projectType ?? "nextjs",
    plugins: [...new Set(config.plugins)].sort(),
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
  overrides: Partial<Pick<NovaProjectConfig, "packageManager" | "uiLibrary" | "projectType" | "name">> = {},
): Promise<NovaProjectConfig> {
  const pkg = await readProjectPackage(targetDir);
  const existing = await readProjectConfig(targetDir);
  const now = new Date().toISOString();

  const config: NovaProjectConfig = existing ?? {
    $schema: "https://nova.dev/schema/project.json",
    version: 1,
    name: overrides.name ?? String(pkg.name ?? path.basename(targetDir)),
    novaVersion: getNovaCliVersion(),
    createdAt: now,
    updatedAt: now,
    packageManager: overrides.packageManager ?? await detectProjectPackageManager(targetDir),
    uiLibrary: overrides.uiLibrary ?? detectProjectUiLibrary(pkg),
    projectType: overrides.projectType ?? detectProjectType(pkg),
    plugins,
  };

  if (overrides.name) config.name = overrides.name;
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
