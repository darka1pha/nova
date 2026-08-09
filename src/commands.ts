import fs from "fs-extra";
import path from "node:path";

import { listAllPluginInfo } from "./generator/pluginInfo.js";
import { getPluginRegistry } from "./plugin/legacyAdapter.js";
import { validatePlugins } from "./plugin/validate.js";
import {
  getNovaCliVersion,
  initializeProjectConfig,
  NOVA_DIR,
  NOVA_MANIFEST_FILE,
  readProjectConfig,
  readProjectPackage,
  writeProjectConfig,
  type NovaProjectConfig,
} from "./project.js";
import type { FeatureKey, PackageManager, UiLibrary } from "./types.js";

export interface ProjectCommandArgs {
  targetDir: string;
  force: boolean;
  dryRun: boolean;
  json: boolean;
  installedOnly: boolean;
  rest: string[];
}

export function parseProjectCommandArgs(args: string[]): ProjectCommandArgs | { error: string } {
  let targetDir = process.cwd();
  let force = false;
  let dryRun = false;
  let json = false;
  let installedOnly = false;
  const rest: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--path" || arg === "-p") {
      if (!args[index + 1]) return { error: "--path requires a directory argument" };
      targetDir = path.resolve(args[++index]);
    } else if (arg === "--force" || arg === "-f") {
      force = true;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--json") {
      json = true;
    } else if (arg === "--installed") {
      installedOnly = true;
    } else if (arg.startsWith("-")) {
      return { error: `Unknown option: ${arg}` };
    } else {
      rest.push(arg);
    }
  }

  return { targetDir, force, dryRun, json, installedOnly, rest };
}

async function getProject(targetDir: string): Promise<{ pkg: Record<string, unknown>; config: NovaProjectConfig }> {
  const pkg = await readProjectPackage(targetDir);
  const config = (await readProjectConfig(targetDir)) ?? (await initializeProjectConfig(targetDir));
  return { pkg, config };
}

export async function initProject(targetDir: string): Promise<NovaProjectConfig> {
  return initializeProjectConfig(targetDir);
}

export interface ProjectStatus {
  name: string;
  version: string;
  projectType: string;
  packageManager: PackageManager;
  uiLibrary: UiLibrary;
  novaVersion: string;
  createdAt: string;
  updatedAt: string;
  pluginsCount: number;
  plugins: FeatureKey[];
  hasGit: boolean;
  hasSrcDir: boolean;
  hasEnvFile: boolean;
  hasEnvExample: boolean;
  health: {
    errorsCount: number;
    warningsCount: number;
    isHealthy: boolean;
  };
}

export async function statusProject(targetDir: string): Promise<ProjectStatus> {
  const { pkg, config } = await getProject(targetDir);
  const doctor = await doctorProject(targetDir);
  const hasGit = await fs.pathExists(path.join(targetDir, ".git"));
  const hasSrcDir = await fs.pathExists(path.join(targetDir, "src"));
  const hasEnvFile = await fs.pathExists(path.join(targetDir, ".env"));
  const hasEnvExample = await fs.pathExists(path.join(targetDir, ".env.example"));

  return {
    name: String(pkg.name ?? path.basename(targetDir)),
    version: String(pkg.version ?? "1.0.0"),
    projectType: config.projectType ?? "nextjs",
    packageManager: config.packageManager,
    uiLibrary: config.uiLibrary,
    novaVersion: config.novaVersion ?? getNovaCliVersion(),
    createdAt: config.createdAt ?? "unknown",
    updatedAt: config.updatedAt ?? "unknown",
    pluginsCount: config.plugins.length,
    plugins: config.plugins,
    hasGit,
    hasSrcDir,
    hasEnvFile,
    hasEnvExample,
    health: {
      errorsCount: doctor.errors.length,
      warningsCount: doctor.warnings.length,
      isHealthy: doctor.errors.length === 0,
    },
  };
}

export interface DetailedProjectInfo {
  name: string;
  version: string;
  description?: string;
  projectType: string;
  packageManager: PackageManager;
  uiLibrary: UiLibrary;
  novaVersion: string;
  manifestLocation: string;
  createdAt: string;
  updatedAt: string;
  structure: {
    hasSrcDir: boolean;
    hasAppRouter: boolean;
    hasPagesRouter: boolean;
  };
  dependencies: {
    next?: string;
    react?: string;
    typescript?: string;
  };
  plugins: Array<{
    id: FeatureKey;
    name: string;
    category?: string;
    description: string;
    dependencies: string[];
    scripts: string[];
    envVariables: string[];
  }>;
  availableScripts: string[];
  deployment: {
    configuredProviders: string[];
  };
}

export async function infoProject(targetDir: string): Promise<DetailedProjectInfo> {
  const { pkg, config } = await getProject(targetDir);
  const deps = {
    ...((pkg.dependencies as Record<string, string>) ?? {}),
    ...((pkg.devDependencies as Record<string, string>) ?? {}),
  };
  const scripts = Object.keys((pkg.scripts as Record<string, string>) ?? {});
  const registry = getPluginRegistry();

  const hasSrc = await fs.pathExists(path.join(targetDir, "src"));
  const hasAppRouter = (await fs.pathExists(path.join(targetDir, "src/app"))) || (await fs.pathExists(path.join(targetDir, "app")));
  const hasPagesRouter = (await fs.pathExists(path.join(targetDir, "src/pages"))) || (await fs.pathExists(path.join(targetDir, "pages")));

  // Detect configured cloud deployments
  const deploymentProviders: string[] = [];
  if (await fs.pathExists(path.join(targetDir, "vercel.json"))) deploymentProviders.push("Vercel");
  if (await fs.pathExists(path.join(targetDir, "wrangler.toml"))) deploymentProviders.push("Cloudflare Pages");
  if (await fs.pathExists(path.join(targetDir, "railway.json"))) deploymentProviders.push("Railway");
  if (await fs.pathExists(path.join(targetDir, "render.yaml"))) deploymentProviders.push("Render");
  if (await fs.pathExists(path.join(targetDir, "apprunner.yaml"))) deploymentProviders.push("AWS App Runner");
  if (await fs.pathExists(path.join(targetDir, "Dockerfile.prod"))) deploymentProviders.push("Docker");

  const pluginsInfo = config.plugins.map((id) => {
    const manifest = registry.getPlugin(id);
    return {
      id,
      name: manifest?.name ?? String(id),
      category: manifest?.category,
      description: manifest?.description ?? "",
      dependencies: Object.keys(manifest?.dependencies ?? {}),
      scripts: Object.keys(manifest?.scripts ?? {}),
      envVariables: (manifest?.env ?? []).map((e) => e.key),
    };
  });

  return {
    name: String(pkg.name ?? path.basename(targetDir)),
    version: String(pkg.version ?? "1.0.0"),
    description: typeof pkg.description === "string" ? pkg.description : undefined,
    projectType: config.projectType ?? "nextjs",
    packageManager: config.packageManager,
    uiLibrary: config.uiLibrary,
    novaVersion: config.novaVersion ?? getNovaCliVersion(),
    manifestLocation: path.join(NOVA_DIR, "project.json"),
    createdAt: config.createdAt ?? "unknown",
    updatedAt: config.updatedAt ?? "unknown",
    structure: {
      hasSrcDir: hasSrc,
      hasAppRouter,
      hasPagesRouter,
    },
    dependencies: {
      next: deps.next,
      react: deps.react,
      typescript: deps.typescript,
    },
    plugins: pluginsInfo,
    availableScripts: scripts,
    deployment: {
      configuredProviders: deploymentProviders,
    },
  };
}

export async function validateProject(targetDir: string): Promise<string[]> {
  const { pkg, config } = await getProject(targetDir);
  const registry = getPluginRegistry();
  const issues = validatePlugins(config.plugins, registry, {
    projectName: String(pkg.name ?? path.basename(targetDir)),
    packageManager: config.packageManager,
    uiLibrary: config.uiLibrary,
    enabledPlugins: config.plugins,
    answers: {},
  });
  return issues.flatMap((issue) => issue.errors.map((error) => `${issue.plugin}: ${error}`));
}

export interface DoctorCheckCategory {
  category: "Environment" | "Lockfile" | "Dependencies" | "Configuration" | "Structure" | "Plugins" | "Environment Variables";
  status: "pass" | "warn" | "error";
  message: string;
}

export interface DoctorResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  checks: DoctorCheckCategory[];
  summary: {
    passed: number;
    warnings: number;
    errors: number;
  };
}

export async function doctorProject(targetDir: string): Promise<DoctorResult> {
  const { pkg, config } = await getProject(targetDir);
  const errors: string[] = [];
  const warnings: string[] = [];
  const checks: DoctorCheckCategory[] = [];

  const addCheck = (category: DoctorCheckCategory["category"], status: DoctorCheckCategory["status"], message: string) => {
    checks.push({ category, status, message });
    if (status === "error") errors.push(message);
    if (status === "warn") warnings.push(message);
  };

  // 1. Node.js runtime check
  const requiredNode = 18;
  const major = Number(process.versions.node.split(".")[0]);
  if (major < requiredNode) {
    addCheck("Environment", "error", `Node.js >= ${requiredNode} is required; currently running on ${process.versions.node}.`);
  } else {
    addCheck("Environment", "pass", `Node.js runtime version ${process.versions.node} satisfies requirement (>= 18.0.0).`);
  }

  // 2. Lockfile alignment check
  const lockfileMap: Record<PackageManager, string> = {
    npm: "package-lock.json",
    pnpm: "pnpm-lock.yaml",
    yarn: "yarn.lock",
    bun: "bun.lockb",
  };
  const expectedLock = lockfileMap[config.packageManager];
  const expectedLockExists = await fs.pathExists(path.join(targetDir, expectedLock));

  if (!expectedLockExists) {
    addCheck("Lockfile", "warn", `Expected lockfile "${expectedLock}" for ${config.packageManager} was not found. Run "${config.packageManager} install".`);
  } else {
    addCheck("Lockfile", "pass", `Found matching ${config.packageManager} lockfile ("${expectedLock}").`);
  }

  // Check for multiple conflicting lockfiles
  const allLocks = Object.values(lockfileMap);
  const foundLocks = [];
  for (const l of allLocks) {
    if (await fs.pathExists(path.join(targetDir, l))) foundLocks.push(l);
  }
  if (foundLocks.length > 1) {
    addCheck("Lockfile", "warn", `Multiple lockfiles detected (${foundLocks.join(", ")}). Consider removing unused lockfiles to prevent dependency resolution conflicts.`);
  }

  // 3. Core dependencies check
  const deps = {
    ...((pkg.dependencies as Record<string, string>) ?? {}),
    ...((pkg.devDependencies as Record<string, string>) ?? {}),
  };

  if (config.projectType === "react-native") {
    if (!deps["expo"]) addCheck("Dependencies", "error", "Missing required dependency: expo");
    if (!deps["react-native"]) addCheck("Dependencies", "error", "Missing required dependency: react-native");
    if (!deps["react"]) addCheck("Dependencies", "error", "Missing required dependency: react");
  } else {
    const required = ["next", "react", "react-dom"];
    for (const name of required) {
      if (!deps[name]) {
        addCheck("Dependencies", "error", `Missing required core dependency: ${name}`);
      } else {
        addCheck("Dependencies", "pass", `Core dependency "${name}" is present (${deps[name]}).`);
      }
    }
  }

  if (!deps["typescript"]) {
    addCheck("Dependencies", "warn", "TypeScript is not listed in dependencies/devDependencies.");
  } else {
    addCheck("Dependencies", "pass", `TypeScript is present (${deps["typescript"]}).`);
  }

  // 4. Configuration files
  if (!(await fs.pathExists(path.join(targetDir, "tsconfig.json")))) {
    addCheck("Configuration", "warn", "Missing tsconfig.json configuration file.");
  } else {
    addCheck("Configuration", "pass", "tsconfig.json is present.");
  }

  if (!(await fs.pathExists(path.join(targetDir, ".env.example")))) {
    addCheck("Configuration", "warn", "Missing .env.example environment template.");
  } else {
    addCheck("Configuration", "pass", ".env.example is present.");
  }

  // 5. Environment Variables Diagnostics
  const envFilePath = path.join(targetDir, ".env");
  const envFileExists = await fs.pathExists(envFilePath);
  if (!envFileExists) {
    addCheck("Environment Variables", "warn", "No local .env file found. Copy .env.example to .env and configure secrets.");
  } else {
    addCheck("Environment Variables", "pass", "Local .env file exists.");

    // Check required plugin env variables
    const envContent = await fs.readFile(envFilePath, "utf8");
    const registry = getPluginRegistry();
    for (const pluginId of config.plugins) {
      const pluginManifest = registry.getPlugin(pluginId);
      for (const envDecl of pluginManifest?.env ?? []) {
        if (envDecl.required && !envContent.includes(envDecl.key)) {
          addCheck("Environment Variables", "warn", `Plugin "${pluginManifest?.name || pluginId}" requires environment variable "${envDecl.key}", but it was not found in .env.`);
        }
      }
    }
  }

  // 6. Plugin validation & constraints
  const validationErrors = await validateProject(targetDir);
  if (validationErrors.length > 0) {
    for (const err of validationErrors) {
      addCheck("Plugins", "error", err);
    }
  } else {
    addCheck("Plugins", "pass", `All ${config.plugins.length} active plugins passed validation.`);
  }

  const passed = checks.filter((c) => c.status === "pass").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;
  const errorCount = checks.filter((c) => c.status === "error").length;

  return {
    ok: errorCount === 0,
    errors,
    warnings,
    checks,
    summary: {
      passed,
      warnings: warnCount,
      errors: errorCount,
    },
  };
}

export interface DriftFinding {
  type: "missing-dependency" | "missing-dev-dependency" | "missing-script" | "missing-template-file" | "missing-env-key" | "unregistered-plugin";
  severity: "error" | "warning" | "info";
  description: string;
  remediation: string;
}

export async function diffProject(targetDir: string): Promise<DriftFinding[]> {
  const { pkg, config } = await getProject(targetDir);
  const findings: DriftFinding[] = [];
  const registry = getPluginRegistry();
  const deps = (pkg.dependencies as Record<string, string>) ?? {};
  const devDeps = (pkg.devDependencies as Record<string, string>) ?? {};
  const scripts = (pkg.scripts as Record<string, string>) ?? {};

  // 1. Check unregistered or deprecated plugins in manifest
  for (const plugin of config.plugins) {
    if (!registry.has(plugin)) {
      findings.push({
        type: "unregistered-plugin",
        severity: "warning",
        description: `Plugin "${plugin}" is listed in project manifest but is not registered in Nova registry.`,
        remediation: `Remove "${plugin}" with "nova remove ${plugin}" or update Nova.`,
      });
    }
  }

  // 2. Check plugin-declared dependencies and scripts
  for (const pluginId of config.plugins) {
    const plugin = registry.getPlugin(pluginId);
    if (!plugin) continue;

    for (const [depName, version] of Object.entries(plugin.dependencies ?? {})) {
      if (!deps[depName]) {
        findings.push({
          type: "missing-dependency",
          severity: "error",
          description: `Plugin "${plugin.name}" requires dependency "${depName}" (${version}), but it is missing from package.json.`,
          remediation: `Run "nova upgrade" or "${config.packageManager} add ${depName}".`,
        });
      }
    }

    for (const [devDepName, version] of Object.entries(plugin.devDependencies ?? {})) {
      if (!devDeps[devDepName]) {
        findings.push({
          type: "missing-dev-dependency",
          severity: "error",
          description: `Plugin "${plugin.name}" requires devDependency "${devDepName}" (${version}), but it is missing from package.json.`,
          remediation: `Run "nova upgrade" or "${config.packageManager} add -D ${devDepName}".`,
        });
      }
    }

    for (const [scriptName, scriptCmd] of Object.entries(plugin.scripts ?? {})) {
      if (!scripts[scriptName]) {
        findings.push({
          type: "missing-script",
          severity: "warning",
          description: `Plugin "${plugin.name}" declares script "${scriptName}" ("${scriptCmd}"), but it is missing from package.json.`,
          remediation: `Run "nova repair" to restore missing plugin scripts.`,
        });
      }
    }
  }

  // 3. Baseline files check
  if (!(await fs.pathExists(path.join(targetDir, ".env.example")))) {
    findings.push({
      type: "missing-template-file",
      severity: "warning",
      description: "Missing template baseline file: .env.example",
      remediation: 'Run "nova repair" to restore .env.example.',
    });
  }

  // 4. Missing plugin env keys in .env.example
  const envExamplePath = path.join(targetDir, ".env.example");
  if (await fs.pathExists(envExamplePath)) {
    const exampleContent = await fs.readFile(envExamplePath, "utf8");
    for (const pluginId of config.plugins) {
      const plugin = registry.getPlugin(pluginId);
      for (const envDecl of plugin?.env ?? []) {
        if (!exampleContent.includes(envDecl.key)) {
          findings.push({
            type: "missing-env-key",
            severity: "info",
            description: `Plugin "${plugin?.name || pluginId}" declares environment variable "${envDecl.key}", but it is not documented in .env.example.`,
            remediation: 'Run "nova repair" to append missing plugin environment variables to .env.example.',
          });
        }
      }
    }
  }

  return findings;
}

export interface UpgradeOptions {
  dryRun?: boolean;
  plugins?: string[];
}

export interface UpgradeResult {
  updatedDependencies: Array<{ name: string; from?: string; to: string }>;
  updatedDevDependencies: Array<{ name: string; from?: string; to: string }>;
  addedScripts: Array<{ name: string; command: string }>;
  dryRun: boolean;
}

/** Reconciles dependency declarations with the installed plugin manifests;
 * it deliberately never overwrites project source/configuration files. */
export async function upgradeProject(targetDir: string, options: UpgradeOptions = {}): Promise<UpgradeResult> {
  const { dryRun = false, plugins: requestedPlugins } = options;
  const { pkg, config } = await getProject(targetDir);
  const registry = getPluginRegistry();

  const dependencies = ((pkg.dependencies as Record<string, string> | undefined) ?? (pkg.dependencies = {} as Record<string, string>));
  const devDependencies = ((pkg.devDependencies as Record<string, string> | undefined) ?? (pkg.devDependencies = {} as Record<string, string>));
  const scripts = ((pkg.scripts as Record<string, string> | undefined) ?? (pkg.scripts = {} as Record<string, string>));

  const updatedDependencies: Array<{ name: string; from?: string; to: string }> = [];
  const updatedDevDependencies: Array<{ name: string; from?: string; to: string }> = [];
  const addedScripts: Array<{ name: string; command: string }> = [];

  const targetPlugins = requestedPlugins && requestedPlugins.length > 0
    ? config.plugins.filter((p) => requestedPlugins.includes(p))
    : config.plugins;

  for (const id of targetPlugins) {
    const plugin = registry.getPlugin(id);
    if (!plugin) continue;

    for (const [name, version] of Object.entries(plugin.dependencies ?? {})) {
      if (dependencies[name] !== version) {
        updatedDependencies.push({ name, from: dependencies[name], to: version });
        if (!dryRun) dependencies[name] = version;
      }
    }

    for (const [name, version] of Object.entries(plugin.devDependencies ?? {})) {
      if (devDependencies[name] !== version) {
        updatedDevDependencies.push({ name, from: devDependencies[name], to: version });
        if (!dryRun) devDependencies[name] = version;
      }
    }

    for (const [name, cmd] of Object.entries(plugin.scripts ?? {})) {
      if (!scripts[name]) {
        addedScripts.push({ name, command: cmd });
        if (!dryRun) scripts[name] = cmd;
      }
    }
  }

  if (!dryRun) {
    if (updatedDependencies.length || updatedDevDependencies.length || addedScripts.length) {
      await fs.writeJson(path.join(targetDir, "package.json"), pkg, { spaces: 2 });
    }
    await writeProjectConfig(targetDir, config);
  }

  return {
    updatedDependencies,
    updatedDevDependencies,
    addedScripts,
    dryRun,
  };
}

export interface RepairResult {
  repairedFiles: string[];
  restoredScripts: string[];
  restoredEnvKeys: string[];
}

/** Repairs deterministic metadata and template configuration drift. */
export async function repairProject(targetDir: string): Promise<RepairResult> {
  const { pkg, config } = await getProject(targetDir);
  const repairedFiles: string[] = [];
  const restoredScripts: string[] = [];
  const restoredEnvKeys: string[] = [];
  const registry = getPluginRegistry();

  // 1. Repair .env.example
  const envExamplePath = path.join(targetDir, ".env.example");
  let envContent = (await fs.pathExists(envExamplePath)) ? await fs.readFile(envExamplePath, "utf8") : "# Environment Variables\n";
  let envModified = false;

  for (const pluginId of config.plugins) {
    const plugin = registry.getPlugin(pluginId);
    for (const envDecl of plugin?.env ?? []) {
      if (!envContent.includes(envDecl.key)) {
        envContent += `\n# ${envDecl.description || plugin?.name || pluginId}\n${envDecl.key}=${envDecl.example || ""}\n`;
        restoredEnvKeys.push(envDecl.key);
        envModified = true;
      }
    }
  }

  if (envModified || !(await fs.pathExists(envExamplePath))) {
    await fs.writeFile(envExamplePath, envContent.trim() + "\n", "utf8");
    repairedFiles.push(".env.example");
  }

  // 2. Repair missing plugin scripts in package.json
  const scripts = ((pkg.scripts as Record<string, string> | undefined) ?? (pkg.scripts = {} as Record<string, string>));
  let scriptsModified = false;

  for (const pluginId of config.plugins) {
    const plugin = registry.getPlugin(pluginId);
    for (const [name, cmd] of Object.entries(plugin?.scripts ?? {})) {
      if (!scripts[name]) {
        scripts[name] = cmd;
        restoredScripts.push(name);
        scriptsModified = true;
      }
    }
  }

  if (scriptsModified) {
    await fs.writeJson(path.join(targetDir, "package.json"), pkg, { spaces: 2 });
    repairedFiles.push("package.json (scripts)");
  }

  // 3. Repair essential .gitignore entries
  const gitignorePath = path.join(targetDir, ".gitignore");
  if (await fs.pathExists(gitignorePath)) {
    let gitignoreContent = await fs.readFile(gitignorePath, "utf8");
    const essential = [".env", ".env*.local", ".nova/cache", "node_modules", ".next", "dist"];
    let gitignoreChanged = false;
    for (const rule of essential) {
      if (!gitignoreContent.includes(rule)) {
        gitignoreContent += `\n${rule}`;
        gitignoreChanged = true;
      }
    }
    if (gitignoreChanged) {
      await fs.writeFile(gitignorePath, gitignoreContent.trim() + "\n", "utf8");
      repairedFiles.push(".gitignore");
    }
  }

  // 4. Ensure authoritative manifest in .nova/project.json is written and up to date
  await writeProjectConfig(targetDir, config);
  repairedFiles.push(NOVA_MANIFEST_FILE);

  return {
    repairedFiles,
    restoredScripts,
    restoredEnvKeys,
  };
}

export async function removePlugins(
  targetDir: string,
  requested: string[],
  force = false,
): Promise<{ removed: FeatureKey[]; skipped: string[] }> {
  const { pkg, config } = await getProject(targetDir);
  const removed: FeatureKey[] = [];
  const skipped: string[] = [];
  const registry = getPluginRegistry();

  for (const id of requested) {
    if (!config.plugins.includes(id as FeatureKey)) {
      skipped.push(id);
      continue;
    }

    const requiredBy = config.plugins.filter((plugin) => registry.getPlugin(plugin)?.requires?.includes(id as FeatureKey));
    if (requiredBy.length && !force) {
      throw new Error(`Cannot remove "${id}" because it is required by ${requiredBy.join(", ")}. Remove dependents first or use --force.`);
    }
    removed.push(id as FeatureKey);
  }

  if (!removed.length) return { removed, skipped };

  const remaining = config.plugins.filter((plugin) => !removed.includes(plugin));

  // Clean dependencies and scripts that are not required by any remaining plugin
  const remainingDependencies = new Set<string>();
  const remainingDevDependencies = new Set<string>();
  const remainingScripts = new Set<string>();

  for (const p of remaining) {
    const manifest = registry.getPlugin(p);
    for (const d of Object.keys(manifest?.dependencies ?? {})) remainingDependencies.add(d);
    for (const d of Object.keys(manifest?.devDependencies ?? {})) remainingDevDependencies.add(d);
    for (const s of Object.keys(manifest?.scripts ?? {})) remainingScripts.add(s);
  }

  for (const plugin of removed) {
    const manifest = registry.getPlugin(plugin);
    for (const name of Object.keys(manifest?.dependencies ?? {})) {
      if (!remainingDependencies.has(name)) delete (pkg.dependencies as Record<string, string> | undefined)?.[name];
    }
    for (const name of Object.keys(manifest?.devDependencies ?? {})) {
      if (!remainingDevDependencies.has(name)) delete (pkg.devDependencies as Record<string, string> | undefined)?.[name];
    }
    for (const name of Object.keys(manifest?.scripts ?? {})) {
      if (!remainingScripts.has(name)) delete (pkg.scripts as Record<string, string> | undefined)?.[name];
    }
  }

  await fs.writeJson(path.join(targetDir, "package.json"), pkg, { spaces: 2 });
  await writeProjectConfig(targetDir, { ...config, plugins: remaining });

  return { removed, skipped };
}

export function listPlugins(query?: string): ReturnType<typeof listAllPluginInfo> {
  const needle = query?.toLowerCase();
  return listAllPluginInfo().filter(
    (plugin) =>
      !needle ||
      [plugin.key, plugin.folder, plugin.metadata.name, plugin.metadata.description, getPluginRegistry().getPlugin(plugin.key)?.category]
        .join(" ")
        .toLowerCase()
        .includes(needle),
  );
}

/** Returns plugin manifests explicitly tracked by a project */
export async function listInstalledPlugins(targetDir: string): Promise<ReturnType<typeof listAllPluginInfo>> {
  const { config } = await getProject(targetDir);
  const installed = new Set(config.plugins);
  return listAllPluginInfo().filter((plugin) => installed.has(plugin.key));
}

export async function cleanProject(targetDir: string, dryRun = false): Promise<string[]> {
  await readProjectPackage(targetDir);
  const candidates = [".next", ".turbo", "node_modules/.cache", ".nova/cache", "dist", ".expo", "coverage"];
  const found: string[] = [];

  for (const relative of candidates) {
    const absolute = path.join(targetDir, relative);
    if (await fs.pathExists(absolute)) {
      found.push(relative);
      if (!dryRun) {
        await fs.remove(absolute);
      }
    }
  }

  return found;
}
