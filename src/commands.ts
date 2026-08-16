import fs from "fs-extra";
import path from "node:path";
import semver from "semver";

import { getPluginInfo, listAllPluginInfo } from "./generator/pluginInfo.js";
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
import { getPackageManagerVersion, LOCKFILES } from "./utils/packageManager.js";
import { ProjectTransaction } from "./utils/transaction.js";
import { PackageResolver } from "./resolver/index.js";
import { collectFeatureRequirements, getBaseDependencyNames } from "./resolver/packageRequirements.js";
import { buildPackageJson } from "./packageManifest.js";

export interface ProjectCommandArgs {
  targetDir: string;
  force: boolean;
  dryRun: boolean;
  json: boolean;
  fix: boolean;
  installedOnly: boolean;
  rest: string[];
}

export function parseProjectCommandArgs(args: string[]): ProjectCommandArgs | { error: string } {
  let targetDir = process.cwd();
  let force = false;
  let dryRun = false;
  let json = false;
  let fix = false;
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
    } else if (arg === "--fix") {
      fix = true;
    } else if (arg === "--installed") {
      installedOnly = true;
    } else if (arg.startsWith("-")) {
      return { error: `Unknown option: ${arg}` };
    } else {
      rest.push(arg);
    }
  }

  return { targetDir, force, dryRun, json, fix, installedOnly, rest };
}

async function getProject(targetDir: string): Promise<{ pkg: Record<string, unknown>; config: NovaProjectConfig }> {
  const pkg = await readProjectPackage(targetDir);
  const config = (await readProjectConfig(targetDir)) ?? (await initializeProjectConfig(targetDir));
  return { pkg, config };
}

export async function initProject(targetDir: string, dryRun = false): Promise<NovaProjectConfig> {
  if (dryRun) {
    const pkg = await readProjectPackage(targetDir);
    const existing = await readProjectConfig(targetDir);
    return existing ?? {
      $schema: "https://nova.dev/schema/project.json",
      version: 1,
      schemaVersion: 1,
      name: String(pkg.name ?? path.basename(targetDir)),
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
  return initializeProjectConfig(targetDir);
}

export interface ProjectStatus {
  name: string;
  version: string;
  projectType: string;
  packageManager: PackageManager;
  uiLibrary: UiLibrary;
  template?: string;
  preset?: string;
  novaVersion: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  pluginsCount: number;
  plugins: FeatureKey[];
  architecture: {
    database: string;
    auth: string;
    api: string;
    testing: string;
    ai: string;
  };
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

  const plugins = config.plugins;

  // Determine architectural layers
  const database = plugins.includes("drizzle")
    ? "Drizzle ORM"
    : plugins.includes("prisma")
    ? "Prisma ORM"
    : plugins.includes("supabase")
    ? "Supabase"
    : "None";

  const auth = plugins.includes("betterAuth")
    ? "Better Auth"
    : plugins.includes("supabase")
    ? "Supabase Auth"
    : "None";

  const api = plugins.includes("trpc")
    ? "tRPC"
    : plugins.includes("graphql")
    ? "GraphQL Yoga"
    : plugins.includes("openapi")
    ? "OpenAPI"
    : "Next.js App Router";

  const testing = plugins.includes("vitest") && plugins.includes("playwright")
    ? "Vitest + Playwright"
    : plugins.includes("vitest")
    ? "Vitest"
    : plugins.includes("playwright")
    ? "Playwright"
    : plugins.includes("cypress")
    ? "Cypress"
    : "None";

  const ai = plugins.includes("ai")
    ? plugins.includes("openai")
      ? "Vercel AI SDK (OpenAI)"
      : plugins.includes("anthropic")
      ? "Vercel AI SDK (Anthropic)"
      : plugins.includes("ollama")
      ? "Vercel AI SDK (Ollama)"
      : "Vercel AI SDK"
    : "None";

  return {
    name: String(pkg.name ?? path.basename(targetDir)),
    version: String(pkg.version ?? "1.0.0"),
    projectType: config.projectType ?? "nextjs",
    packageManager: config.packageManager,
    uiLibrary: config.uiLibrary,
    template: config.template,
    preset: config.preset,
    novaVersion: config.novaVersion ?? getNovaCliVersion(),
    schemaVersion: config.schemaVersion ?? 1,
    createdAt: config.createdAt ?? "unknown",
    updatedAt: config.updatedAt ?? "unknown",
    pluginsCount: config.plugins.length,
    plugins: config.plugins,
    architecture: {
      database,
      auth,
      api,
      testing,
      ai,
    },
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
  schemaVersion: number;
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
    version?: string;
    category?: string;
    capabilities?: string[];
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
      version: config.pluginVersions?.[id] ?? manifest?.version ?? "1.0.0",
      category: manifest?.category,
      capabilities: manifest?.capabilities,
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
    schemaVersion: config.schemaVersion ?? 1,
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

  // 1. Environment: Node.js runtime & Package Manager
  const requiredNode = 18;
  const major = Number(process.versions.node.split(".")[0]);
  if (major < requiredNode) {
    addCheck("Environment", "error", `Node.js >= ${requiredNode} is required; currently running on ${process.versions.node}.`);
  } else {
    addCheck("Environment", "pass", `Node.js runtime ${process.versions.node} on ${process.platform} satisfies requirement (>= 18.0.0).`);
  }

  const pmVersion = await getPackageManagerVersion(config.packageManager);
  if (pmVersion) {
    addCheck("Environment", "pass", `Configured package manager "${config.packageManager}" is installed (v${pmVersion}).`);
  } else {
    addCheck("Environment", "warn", `Package manager binary "${config.packageManager}" was not found in PATH.`);
  }

  // 2. Lockfile alignment check
  const expectedLock = LOCKFILES[config.packageManager];
  const expectedLockExists = await fs.pathExists(path.join(targetDir, expectedLock));

  if (!expectedLockExists) {
    addCheck("Lockfile", "warn", `Expected lockfile "${expectedLock}" for ${config.packageManager} was not found. Run "${config.packageManager} install".`);
  } else {
    addCheck("Lockfile", "pass", `Found matching ${config.packageManager} lockfile ("${expectedLock}").`);
  }

  // Check for multiple conflicting lockfiles
  const allLocks = Object.values(LOCKFILES);
  const foundLocks = [];
  for (const l of allLocks) {
    if (await fs.pathExists(path.join(targetDir, l))) foundLocks.push(l);
  }
  if (foundLocks.length > 1) {
    addCheck("Lockfile", "warn", `Multiple lockfiles detected (${foundLocks.join(", ")}). Consider removing unused lockfiles to prevent dependency resolution conflicts.`);
  }

  // 3. Project & Manifest State
  if (config.schemaVersion === undefined || config.schemaVersion < 1) {
    addCheck("Configuration", "warn", "Manifest schema is outdated. Run \"nova repair\" to upgrade to schemaVersion 1.");
  } else {
    addCheck("Configuration", "pass", `Project manifest .nova/project.json is valid (schemaVersion: ${config.schemaVersion}).`);
  }

  // 4. Core dependencies check
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

  // 5. Configuration files
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

  // 6. Environment Variables Diagnostics (Audit keys without leaking secret values)
  const envFilePath = path.join(targetDir, ".env");
  const envFileExists = await fs.pathExists(envFilePath);
  if (!envFileExists) {
    addCheck("Environment Variables", "warn", "No local .env file found. Copy .env.example to .env and configure secrets.");
  } else {
    addCheck("Environment Variables", "pass", "Local .env file exists.");

    const envContent = await fs.readFile(envFilePath, "utf8");
    const registry = getPluginRegistry();
    for (const pluginId of config.plugins) {
      const pluginManifest = registry.getPlugin(pluginId);
      for (const envDecl of pluginManifest?.env ?? []) {
        if (envDecl.required && !envContent.includes(envDecl.key)) {
          addCheck("Environment Variables", "warn", `Plugin "${pluginManifest?.name || pluginId}" requires environment variable "${envDecl.key}", but it was not declared in .env.`);
        }
      }
    }
  }

  // 7. Plugin validation & constraints
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
  type: "missing-dependency" | "missing-dev-dependency" | "missing-script" | "missing-template-file" | "missing-env-key" | "unregistered-plugin" | "version-drift";
  severity: "error" | "warning" | "info";
  classification: "SAFE TO REPAIR" | "MANUAL REVIEW REQUIRED" | "INFORMATIONAL";
  plugin?: string;
  description: string;
  remediation: string;
}

export async function diffProject(targetDir: string, pluginFilter?: string): Promise<DriftFinding[]> {
  const { pkg, config } = await getProject(targetDir);
  const findings: DriftFinding[] = [];
  const registry = getPluginRegistry();
  const deps = (pkg.dependencies as Record<string, string>) ?? {};
  const devDeps = (pkg.devDependencies as Record<string, string>) ?? {};
  const scripts = (pkg.scripts as Record<string, string>) ?? {};

  const targetPlugins = pluginFilter
    ? config.plugins.filter((p) => p === pluginFilter || p.toLowerCase() === pluginFilter.toLowerCase())
    : config.plugins;

  // 1. Check unregistered plugins in manifest
  for (const plugin of targetPlugins) {
    if (!registry.has(plugin)) {
      findings.push({
        type: "unregistered-plugin",
        severity: "warning",
        classification: "INFORMATIONAL",
        plugin,
        description: `Plugin "${plugin}" is listed in project manifest but is not registered in Nova registry.`,
        remediation: `Remove "${plugin}" with "nova remove ${plugin}" or update Nova CLI.`,
      });
    }
  }

  // 2. Check plugin-declared dependencies, devDependencies, and scripts
  for (const pluginId of targetPlugins) {
    const plugin = registry.getPlugin(pluginId);
    if (!plugin) continue;

    for (const [depName, version] of Object.entries(plugin.dependencies ?? {})) {
      if (!deps[depName]) {
        findings.push({
          type: "missing-dependency",
          severity: "error",
          classification: "SAFE TO REPAIR",
          plugin: pluginId,
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
          classification: "SAFE TO REPAIR",
          plugin: pluginId,
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
          classification: "SAFE TO REPAIR",
          plugin: pluginId,
          description: `Plugin "${plugin.name}" declares script "${scriptName}" ("${scriptCmd}"), but it is missing from package.json.`,
          remediation: 'Run "nova repair" to restore missing plugin scripts.',
        });
      }
    }
  }

  // 3. Baseline files check
  if (!pluginFilter) {
    if (!(await fs.pathExists(path.join(targetDir, ".env.example")))) {
      findings.push({
        type: "missing-template-file",
        severity: "warning",
        classification: "SAFE TO REPAIR",
        description: "Missing template baseline file: .env.example",
        remediation: 'Run "nova repair" to restore .env.example.',
      });
    }
  }

  // 4. Missing plugin env keys in .env.example
  const envExamplePath = path.join(targetDir, ".env.example");
  if (await fs.pathExists(envExamplePath)) {
    const exampleContent = await fs.readFile(envExamplePath, "utf8");
    for (const pluginId of targetPlugins) {
      const plugin = registry.getPlugin(pluginId);
      for (const envDecl of plugin?.env ?? []) {
        if (!exampleContent.includes(envDecl.key)) {
          findings.push({
            type: "missing-env-key",
            severity: "info",
            classification: "SAFE TO REPAIR",
            plugin: pluginId,
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
  all?: boolean;
}

export interface UpgradeResult {
  updatedDependencies: Array<{ name: string; from?: string; to: string; strategy?: string }>;
  updatedDevDependencies: Array<{ name: string; from?: string; to: string; strategy?: string }>;
  addedScripts: Array<{ name: string; command: string }>;
  incompatible: Array<{ name: string; current: string; latest: string; reason: string }>;
  upToDate: Array<{ name: string; version: string }>;
  manualReview: string[];
  dryRun: boolean;
  warnings: string[];
}

/** Reconciles dependency declarations with installed plugin manifests, resolving latest compatible versions from the registry. */
export async function upgradeProject(targetDir: string, options: UpgradeOptions = {}): Promise<UpgradeResult> {
  const { dryRun = false, plugins: requestedPlugins } = options;
  const { pkg, config } = await getProject(targetDir);
  const registry = getPluginRegistry();

  const dependencies = ((pkg.dependencies as Record<string, string> | undefined) ?? (pkg.dependencies = {} as Record<string, string>));
  const devDependencies = ((pkg.devDependencies as Record<string, string> | undefined) ?? (pkg.devDependencies = {} as Record<string, string>));
  const scripts = ((pkg.scripts as Record<string, string> | undefined) ?? (pkg.scripts = {} as Record<string, string>));

  const updatedDependencies: Array<{ name: string; from?: string; to: string; strategy?: string }> = [];
  const updatedDevDependencies: Array<{ name: string; from?: string; to: string; strategy?: string }> = [];
  const addedScripts: Array<{ name: string; command: string }> = [];
  const incompatible: Array<{ name: string; current: string; latest: string; reason: string }> = [];
  const upToDate: Array<{ name: string; version: string }> = [];
  const manualReview: string[] = [];
  const warnings: string[] = [];

  const targetPlugins = requestedPlugins && requestedPlugins.length > 0
    ? config.plugins.filter((p) => requestedPlugins.includes(p))
    : config.plugins;

  // Collect all requirements from target plugins and resolve from registry
  const requirements = collectFeatureRequirements(targetPlugins as FeatureKey[]);
  const resolver = new PackageResolver();
  let resolvedMap = new Map<string, { version: string; range: string; strategy: string }>();

  try {
    const result = await resolver.resolvePackages(requirements);
    for (const r of result.resolved) {
      resolvedMap.set(r.name, { version: r.version, range: r.versionRange, strategy: r.strategy });
    }
    for (const f of result.failed) {
      warnings.push(`Could not resolve "${f.name}": ${f.reason}. Skipping.`);
    }
  } catch (error) {
    warnings.push(`Package resolution failed: ${error instanceof Error ? error.message : String(error)}. Falling back to static versions.`);
    // Fall back to static version comparison (original behavior)
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

    if (!dryRun && (updatedDependencies.length || updatedDevDependencies.length || addedScripts.length)) {
      const transaction = new ProjectTransaction(targetDir);
      transaction.begin();
      try {
        await transaction.snapshotFile("package.json");
        await transaction.snapshotFile(".nova/project.json");
        await transaction.snapshotFile(".nova.json");
        await fs.writeJson(path.join(targetDir, "package.json"), pkg, { spaces: 2 });
        await writeProjectConfig(targetDir, config);
        transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    }

    return { updatedDependencies, updatedDevDependencies, addedScripts, incompatible, upToDate, manualReview, dryRun, warnings };
  }

  // Use resolved versions for upgrade decisions
  for (const id of targetPlugins) {
    const plugin = registry.getPlugin(id);
    if (!plugin) continue;

    for (const [name, declaredRange] of Object.entries(plugin.dependencies ?? {})) {
      const currentVersion = dependencies[name];
      const resolved = resolvedMap.get(name);

      if (!resolved) continue;

      if (!currentVersion) {
        // New dependency not yet installed
        updatedDependencies.push({ name, to: resolved.range, strategy: resolved.strategy });
        if (!dryRun) dependencies[name] = resolved.range;
        continue;
      }

      const currentClean = semver.minVersion(currentVersion)?.version;
      if (!currentClean) {
        updatedDependencies.push({ name, from: currentVersion, to: resolved.range, strategy: resolved.strategy });
        if (!dryRun) dependencies[name] = resolved.range;
        continue;
      }

      if (semver.eq(currentClean, resolved.version)) {
        upToDate.push({ name, version: currentClean });
        continue;
      }

      // Check for incompatible major version changes
      if (semver.major(currentClean) !== semver.major(resolved.version)) {
        incompatible.push({
          name,
          current: currentClean,
          latest: resolved.version,
          reason: `Major version change (${semver.major(currentClean)} → ${semver.major(resolved.version)}). Manual upgrade required.`,
        });
        continue;
      }

      // Safe update within same major
      if (semver.lt(currentClean, resolved.version)) {
        updatedDependencies.push({ name, from: currentVersion, to: resolved.range, strategy: resolved.strategy });
        if (!dryRun) dependencies[name] = resolved.range;
      } else {
        upToDate.push({ name, version: currentClean });
      }
    }

    for (const [name, declaredRange] of Object.entries(plugin.devDependencies ?? {})) {
      const currentVersion = devDependencies[name];
      const resolved = resolvedMap.get(name);

      if (!resolved) continue;

      if (!currentVersion) {
        updatedDevDependencies.push({ name, to: resolved.range, strategy: resolved.strategy });
        if (!dryRun) devDependencies[name] = resolved.range;
        continue;
      }

      const currentClean = semver.minVersion(currentVersion)?.version;
      if (!currentClean) {
        updatedDevDependencies.push({ name, from: currentVersion, to: resolved.range, strategy: resolved.strategy });
        if (!dryRun) devDependencies[name] = resolved.range;
        continue;
      }

      if (semver.eq(currentClean, resolved.version)) {
        upToDate.push({ name, version: currentClean });
        continue;
      }

      if (semver.major(currentClean) !== semver.major(resolved.version)) {
        incompatible.push({
          name,
          current: currentClean,
          latest: resolved.version,
          reason: `Major version change (${semver.major(currentClean)} → ${semver.major(resolved.version)}). Manual upgrade required.`,
        });
        continue;
      }

      if (semver.lt(currentClean, resolved.version)) {
        updatedDevDependencies.push({ name, from: currentVersion, to: resolved.range, strategy: resolved.strategy });
        if (!dryRun) devDependencies[name] = resolved.range;
      } else {
        upToDate.push({ name, version: currentClean });
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
    const transaction = new ProjectTransaction(targetDir);
    transaction.begin();
    try {
      await transaction.snapshotFile("package.json");
      await transaction.snapshotFile(".nova/project.json");
      await transaction.snapshotFile(".nova.json");

      if (updatedDependencies.length || updatedDevDependencies.length || addedScripts.length) {
        await fs.writeJson(path.join(targetDir, "package.json"), pkg, { spaces: 2 });
      }
      await writeProjectConfig(targetDir, config);
      transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  return {
    updatedDependencies,
    updatedDevDependencies,
    addedScripts,
    incompatible,
    upToDate,
    manualReview,
    dryRun,
    warnings,
  };
}

export interface RepairResult {
  repairedFiles: string[];
  restoredScripts: string[];
  restoredEnvKeys: string[];
  dryRun?: boolean;
}

/** Repairs deterministic metadata, scripts, and template configuration drift. */
export async function repairProject(targetDir: string, options: { dryRun?: boolean } = {}): Promise<RepairResult> {
  const { dryRun = false } = options;
  const { pkg, config } = await getProject(targetDir);
  const repairedFiles: string[] = [];
  const restoredScripts: string[] = [];
  const restoredEnvKeys: string[] = [];
  const registry = getPluginRegistry();

  const transaction = new ProjectTransaction(targetDir);
  if (!dryRun) {
    transaction.begin();
  }

  try {
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
      if (!dryRun) {
        await transaction.snapshotFile(".env.example");
        await fs.writeFile(envExamplePath, envContent.trim() + "\n", "utf8");
      }
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
      if (!dryRun) {
        await transaction.snapshotFile("package.json");
        await fs.writeJson(path.join(targetDir, "package.json"), pkg, { spaces: 2 });
      }
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
        if (!dryRun) {
          await transaction.snapshotFile(".gitignore");
          await fs.writeFile(gitignorePath, gitignoreContent.trim() + "\n", "utf8");
        }
        repairedFiles.push(".gitignore");
      }
    }

    // 4. Ensure authoritative manifest in .nova/project.json is written and up to date
    if (!dryRun) {
      await transaction.snapshotFile(".nova/project.json");
      await transaction.snapshotFile(".nova.json");
      await writeProjectConfig(targetDir, config);
    }
    repairedFiles.push(NOVA_MANIFEST_FILE);

    if (!dryRun) {
      transaction.commit();
    }

    return {
      repairedFiles,
      restoredScripts,
      restoredEnvKeys,
      dryRun,
    };
  } catch (error) {
    if (!dryRun) {
      await transaction.rollback();
    }
    throw error;
  }
}

export async function removePlugins(
  targetDir: string,
  requested: string[],
  options: { force?: boolean; dryRun?: boolean } | boolean = false,
): Promise<{ removed: FeatureKey[]; skipped: string[]; dryRun?: boolean }> {
  const force = typeof options === "boolean" ? options : (options.force ?? false);
  const dryRun = typeof options === "boolean" ? false : (options.dryRun ?? false);

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

  if (!removed.length) return { removed, skipped, dryRun };

  const remaining = config.plugins.filter((plugin) => !removed.includes(plugin));

  // Clean dependencies and scripts that are not required by any remaining plugin
  // Also protect base project dependencies (react, next, typescript, etc.)
  const uiLibrary = (config.uiLibrary ?? "shadcn") as UiLibrary;
  const baseDeps = getBaseDependencyNames(uiLibrary);
  const remainingDependencies = new Set<string>();
  const remainingDevDependencies = new Set<string>();
  const remainingScripts = new Set<string>();

  // Base project deps are always protected
  for (const name of baseDeps) {
    remainingDependencies.add(name);
    remainingDevDependencies.add(name);
  }

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

  if (!dryRun) {
    const transaction = new ProjectTransaction(targetDir);
    transaction.begin();
    try {
      await transaction.snapshotFile("package.json");
      await transaction.snapshotFile(".nova/project.json");
      await transaction.snapshotFile(".nova.json");

      await fs.writeJson(path.join(targetDir, "package.json"), pkg, { spaces: 2 });
      await writeProjectConfig(targetDir, { ...config, plugins: remaining });
      transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  return { removed, skipped, dryRun };
}

export function listPlugins(query?: string): ReturnType<typeof listAllPluginInfo> {
  const needle = query?.toLowerCase();
  return listAllPluginInfo().filter(
    (plugin) =>
      !needle ||
      [
        plugin.key,
        plugin.folder,
        plugin.metadata.name,
        plugin.metadata.description,
        ...(plugin.metadata.capabilities ?? []),
        ...(plugin.metadata.owns ?? []),
        getPluginRegistry().getPlugin(plugin.key)?.category,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
  );
}

export function getPluginTree(featureKey: FeatureKey): { plugin: FeatureKey; requires: FeatureKey[]; requiredBy: FeatureKey[] } {
  const registry = getPluginRegistry();
  const manifest = registry.getPlugin(featureKey);
  const requires = (manifest?.requires ?? []) as FeatureKey[];
  const all = listAllPluginInfo();
  const requiredBy = all.filter((p) => p.metadata.requires?.includes(featureKey)).map((p) => p.key);

  return {
    plugin: featureKey,
    requires,
    requiredBy,
  };
}

export function getPluginConflicts(featureKey: FeatureKey): Array<{ plugin: FeatureKey; name: string; reason: string }> {
  const registry = getPluginRegistry();
  const manifest = registry.getPlugin(featureKey);
  const conflicts = (manifest?.conflicts ?? []) as FeatureKey[];
  const all = listAllPluginInfo();

  // Also include any plugins that declare a conflict on this plugin
  const reverseConflicts = all.filter((p) => p.metadata.conflicts?.includes(featureKey)).map((p) => p.key);
  const total = [...new Set([...conflicts, ...reverseConflicts])];

  return total.map((c) => {
    const conflictManifest = registry.getPlugin(c);
    const reason =
      manifest?.conflictReasons?.[c] ??
      conflictManifest?.conflictReasons?.[featureKey] ??
      `${manifest?.name || featureKey} and ${conflictManifest?.name || c} cannot both be active.`;
    return {
      plugin: c,
      name: conflictManifest?.name ?? c,
      reason,
    };
  });
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
