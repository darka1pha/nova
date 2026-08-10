import { bail, devCommand, installCommand, type PackageManager } from "@nova/core";
import * as p from "@clack/prompts";
import { execa } from "execa";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";

import { addFeaturesToProject } from "./add.js";
import { generateDeploymentConfig, listDeploymentProviders } from "./deployment/index.js";
import { generateProject } from "./generator/index.js";
import { generateMobileProject } from "./generator/mobile.js";
import { getPluginInfo, listAllPluginInfo, summarizeFootprint } from "./generator/pluginInfo.js";
import { resolveFeatureKey } from "./addonRegistry.js";
import { runPluginHook } from "./plugin/runHooks.js";
import { collectAnswers, FEATURE_OPTIONS, isValidProjectName, type CliCreateOptions } from "./prompts.js";
import { runPluginSubcommand } from "./commands/plugin.js";
import { runTemplateSubcommand } from "./commands/template.js";
import { runEnvSubcommand } from "./commands/env.js";
import { getPluginRegistryManager, formatTrustBadge } from "./registry/index.js";
import { getProjectEnvStatus } from "./env/manager.js";
import type { UiLibrary } from "./types.js";

import {
  cleanProject,
  diffProject,
  doctorProject,
  infoProject,
  initProject,
  listInstalledPlugins,
  listPlugins,
  parseProjectCommandArgs,
  removePlugins,
  repairProject,
  statusProject,
  upgradeProject,
  validateProject,
} from "./commands.js";


const __dirname = path.dirname(fileURLToPath(import.meta.url));

const UI_LIBRARY_KEYWORDS = new Set([
  "shadcn",
  "mui",
  "chakra",
  "ant",
  "mantine",
  "hero",
  "daisy",
  "headless",
]);

function readPackageVersion(): string {
  try {
    const pkgPath = path.join(__dirname, "..", "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { version?: string };
    return pkg.version ?? "0.1.8";
  } catch {
    return "0.1.8";
  }
}

function printHelp() {
  console.log(`
${pc.bold("nova")} - extensible Next.js & mobile app generator and lifecycle platform

${pc.bold("Usage")}
  nova [create] [project-name] [options]
  nova search <term>
  nova plugins [feature] | nova plugins search <term> | nova plugins tree <feature> | nova plugins conflicts <feature>
  nova plugin create <name> | validate | test | build | info <id>
  nova template list | info <name> | presets
  nova env | nova env check | nova env example
  nova add <feature...> [options]
  nova remove <plugin...> [--path <dir>] [--force]
  nova deploy [provider] [--path <dir>] [--dry-run] [--list]
  nova status | info | doctor | validate | clean | diff | upgrade | repair [--path <dir>]

${pc.bold("Project Creation Options")}
  -t, --template <name>    Template to use: default, saas, ai, dashboard, api, react-native
  --preset <name>          Preset to apply: fullstack, saas, ai, dashboard, api
  --ui <library>           UI Library: shadcn, mui, chakra, ant, mantine, hero, daisy, headless
  --pm <manager>           Package manager: pnpm, npm, yarn, bun
  -y, --yes                Non-interactive mode (use defaults)

${pc.bold("General Options")}
  -h, --help               Show this help message
  -v, --version            Print the installed version
  -p, --path <dir>         Target project directory (default: current directory)
  -f, --force              Overwrite files that already exist
  --dry-run                Preview operations without modifying files
  --json                   Print structured JSON output

${pc.bold("Examples")}
  nova my-app
  nova create my-saas --preset saas
  nova create my-ai-app --template ai
  nova search database
  nova plugins prisma
  nova plugin create my-custom-plugin
  nova env check
  nova deploy vercel --dry-run
`);
}


import { formatPlan } from "./generator/planner.js";
import { getPluginConflicts, getPluginTree } from "./commands.js";

interface ParsedAddArgs {
  features: string[];
  targetPath: string;
  force: boolean;
  yes: boolean;
  dryRun: boolean;
  json: boolean;
}

function parseAddArgs(args: string[]): ParsedAddArgs | { error: string } {
  const features: string[] = [];
  let targetPath = process.cwd();
  let force = false;
  let yes = false;
  let dryRun = false;
  let json = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--path" || arg === "-p") {
      const value = args[i + 1];
      if (!value) return { error: "--path requires a directory argument" };
      targetPath = path.resolve(value);
      i += 1;
      continue;
    }

    if (arg === "--force" || arg === "-f") {
      force = true;
      continue;
    }

    if (arg === "--yes" || arg === "-y") {
      yes = true;
      continue;
    }

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg === "--json") {
      json = true;
      continue;
    }

    if (arg.startsWith("-")) {
      return { error: `Unknown option: ${arg}` };
    }

    features.push(arg);
  }

  return { features, targetPath, force, yes, dryRun, json };
}

async function promptForFeatures(): Promise<string[]> {
  const selected = await p.multiselect({
    message: "Select features to add to this project",
    required: true,
    options: FEATURE_OPTIONS,
  });

  if (p.isCancel(selected)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  return selected as string[];
}

async function runAddCommand(args: string[]) {
  const parsed = parseAddArgs(args);
  if ("error" in parsed) {
    console.error(parsed.error);
    printHelp();
    process.exitCode = 1;
    return;
  }

  const { targetPath, force, yes, dryRun, json } = parsed;
  let { features } = parsed;

  if (features.length === 0) {
    features = await promptForFeatures();
  }

  if (!json && !dryRun) {
    p.intro(pc.bgCyan(pc.black(" nova add ")));
  }

  const spinner = p.spinner();
  if (!json && !dryRun) {
    spinner.start("Adding features to project");
  }

  let result;
  try {
    result = await addFeaturesToProject(targetPath, features, {
      force,
      dryRun,
      skipPrompts: yes,
      onStep: (step) => {
        if (!json && !dryRun) spinner.message(step);
      },
    });
  } catch (error) {
    if (!json && !dryRun) spinner.stop("Failed to add features", 1);
    if (json) {
      console.log(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
    } else {
      p.log.error(error instanceof Error ? error.message : String(error));
    }
    process.exitCode = 1;
    return;
  }

  if (result.dependencyIssues.length && result.outcomes.length === 0) {
    if (!json && !dryRun) spinner.stop("Failed to add features", 1);
    if (json) {
      console.log(JSON.stringify({ ok: false, errors: result.dependencyIssues }, null, 2));
    } else {
      for (const issue of result.dependencyIssues) {
        p.log.error(issue);
      }
    }
    process.exitCode = 1;
    return;
  }

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (dryRun && result.plan) {
    console.log(formatPlan(result.plan));
    return;
  }

  spinner.stop("Done");

  console.log("");
  console.log(
    pc.bold(
      `Project structure: ${result.usesSrcDir ? "src/ directory" : "root-level (no src/)"}`,
    ),
  );

  for (const outcome of result.outcomes) {
    console.log("");
    console.log(pc.bold(pc.cyan(outcome.feature)));

    if (outcome.filesWritten.length) {
      console.log(`  files added:      ${outcome.filesWritten.length}`);
    } else {
      console.log(pc.dim("  files added:      none (nothing new to copy)"));
    }

    if (outcome.filesSkipped.length) {
      console.log(
        pc.dim(
          `  files skipped:    ${outcome.filesSkipped.length} already existed (use --force to overwrite)`,
        ),
      );
    }

    if (outcome.addedDependencies.length) {
      console.log(`  dependencies:     ${outcome.addedDependencies.join(", ")}`);
    }

    if (outcome.addedDevDependencies.length) {
      console.log(`  devDependencies:  ${outcome.addedDevDependencies.join(", ")}`);
    }

    if (outcome.addedScripts.length) {
      console.log(`  scripts added:    ${outcome.addedScripts.join(", ")}`);
    }

    if (outcome.skippedScripts.length) {
      console.log(
        pc.dim(`  scripts skipped:  ${outcome.skippedScripts.join(", ")} (already defined)`),
      );
    }

    if (outcome.patchedFiles.length) {
      console.log(`  files patched:    ${outcome.patchedFiles.join(", ")}`);
    }

    if (outcome.addedEnvKeys.length) {
      console.log(`  env vars added:   ${outcome.addedEnvKeys.join(", ")}`);
    }

    if (outcome.skippedEnvKeys.length) {
      console.log(
        pc.dim(`  env vars skipped: ${outcome.skippedEnvKeys.join(", ")} (already defined)`),
      );
    }

    if (outcome.writtenDocs.length) {
      console.log(`  docs written:     ${outcome.writtenDocs.join(", ")}`);
    }

    if (outcome.skippedDocs.length) {
      console.log(
        pc.dim(`  docs skipped:     ${outcome.skippedDocs.join(", ")} (already existed)`),
      );
    }
  }

  if (result.unknownFeatures.length) {
    console.log("");
    for (const unknown of result.unknownFeatures) {
      if (UI_LIBRARY_KEYWORDS.has(unknown.toLowerCase())) {
        p.log.warn(
          `"${unknown}" looks like a UI library, not a feature. Switching UI libraries on an existing project isn't supported by "nova add" yet.`,
        );
      } else {
        p.log.warn(`Unknown feature: "${unknown}" (skipped)`);
      }
    }
  }

  if (result.outcomes.length === 0) {
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log(pc.dim("Run your package manager's install command to pull in any new dependencies."));
  p.outro(pc.green("Done!"));
}

function printPluginSummary(info: ReturnType<typeof getPluginInfo>) {
  const { key, metadata, packageFootprint } = info;

  console.log(pc.bold(pc.cyan(metadata.name)) + pc.dim(`  (${key})`));
  console.log(`  ${metadata.description}`);

  if (metadata.capabilities?.length) {
    console.log(`  ${pc.dim("capabilities:")}  ${metadata.capabilities.join(", ")}`);
  }

  if (metadata.owns?.length) {
    console.log(`  ${pc.dim("owns:")}          ${metadata.owns.join(", ")}`);
  }

  if (metadata.requires?.length) {
    console.log(`  ${pc.dim("requires:")}      ${metadata.requires.join(", ")}`);
  }

  if (metadata.conflicts?.length) {
    console.log(`  ${pc.dim("conflicts with:")} ${metadata.conflicts.join(", ")}`);
  }

  if (metadata.supportedUI?.length) {
    console.log(`  ${pc.dim("supported UI:")}   ${metadata.supportedUI.join(", ")}`);
  }

  console.log(`  ${pc.dim("package.json:")}   ${summarizeFootprint(packageFootprint)}`);
}

function runPluginsCommand(args: string[]) {
  const json = args.includes("--json");
  const filteredArgs = args.filter((a) => a !== "--json");
  const sub = filteredArgs[0];

  if (sub === "search") {
    const query = filteredArgs.slice(1).join(" ").trim();
    if (!query) {
      console.error("Usage: nova plugins search <query>");
      process.exitCode = 1;
      return;
    }
    const results = listPlugins(query);
    if (json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log(pc.bold(`Search results for "${query}" (${results.length}):\n`));
      for (const r of results) printPluginSummary(r);
    }
    return;
  }

  if (sub === "tree") {
    const target = filteredArgs[1];
    const resolved = target ? resolveFeatureKey(target) : undefined;
    if (!resolved) {
      console.error(`Unknown plugin: "${target ?? ""}"`);
      process.exitCode = 1;
      return;
    }
    const tree = getPluginTree(resolved);
    if (json) {
      console.log(JSON.stringify(tree, null, 2));
    } else {
      console.log(pc.bold(`\nPlugin Dependency Tree: ${pc.cyan(resolved)}\n`));
      console.log(`  ${pc.dim("Requires:")}     ${tree.requires.length ? tree.requires.join(", ") : "(none)"}`);
      console.log(`  ${pc.dim("Required By:")}  ${tree.requiredBy.length ? tree.requiredBy.join(", ") : "(none)"}\n`);
    }
    return;
  }

  if (sub === "conflicts") {
    const target = filteredArgs[1];
    const resolved = target ? resolveFeatureKey(target) : undefined;
    if (!resolved) {
      console.error(`Unknown plugin: "${target ?? ""}"`);
      process.exitCode = 1;
      return;
    }
    const conflicts = getPluginConflicts(resolved);
    if (json) {
      console.log(JSON.stringify(conflicts, null, 2));
    } else {
      console.log(pc.bold(`\nPlugin Conflicts for: ${pc.cyan(resolved)} (${conflicts.length})\n`));
      if (!conflicts.length) {
        console.log("  No conflicting plugins.\n");
      } else {
        for (const c of conflicts) {
          console.log(`  ${pc.red("✖")} ${pc.bold(c.name)} (${c.plugin})`);
          console.log(`    ${pc.dim("Reason:")} ${c.reason}`);
        }
        console.log("");
      }
    }
    return;
  }

  if (sub && sub !== "list") {
    const resolved = resolveFeatureKey(sub);
    if (!resolved) {
      console.error(`Unknown plugin: "${sub}"`);
      console.log(pc.dim("Run `nova plugins` with no argument to see all available plugins."));
      process.exitCode = 1;
      return;
    }

    const info = getPluginInfo(resolved);
    if (json) {
      console.log(JSON.stringify(info, null, 2));
    } else {
      printPluginSummary(info);
    }
    return;
  }

  const all = listAllPluginInfo();
  if (json) {
    console.log(JSON.stringify(all, null, 2));
    return;
  }

  console.log(pc.bold(`Available plugins (${all.length})\n`));

  for (const info of all) {
    printPluginSummary(info);
    console.log("");
  }

  console.log(pc.dim("Use `nova plugins <feature>` to see details for a single plugin."));
  console.log(pc.dim("Use `nova add <feature...>` to add one to an existing project."));
}

async function runDeployCommand(args: string[]) {
  const providers = listDeploymentProviders();

  if (args.includes("--list") || args.includes("-l")) {
    console.log(pc.bold("\nSupported Cloud Deployment Providers:\n"));
    for (const p of providers) {
      console.log(`  ${pc.cyan(p.id.padEnd(14))} ${pc.bold(p.name)} - ${p.description}`);
    }
    console.log("");
    return;
  }

  let targetDir = process.cwd();
  let force = false;
  let dryRun = false;
  let json = false;
  let providerArg: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--path" || arg === "-p") {
      targetDir = path.resolve(process.cwd(), args[++i] || ".");
    } else if (arg === "--force" || arg === "-f") {
      force = true;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--json") {
      json = true;
    } else if (!arg.startsWith("-") && !providerArg) {
      providerArg = arg;
    }
  }

  let selectedProvider = providerArg;
  if (!selectedProvider) {
    p.intro(pc.bgCyan(pc.black(" nova deploy ")));
    const choice = await p.select<string>({
      message: "Which cloud deployment provider do you want to configure?",
      options: providers.map((p) => ({
        value: p.id,
        label: p.name,
        hint: p.description,
      })),
    });
    bail(choice);
    selectedProvider = choice;
  }

  const spinner = p.spinner();
  if (!json && !dryRun) {
    spinner.start(`Configuring deployment for ${selectedProvider}`);
  }

  try {
    const result = await generateDeploymentConfig(selectedProvider, {
      targetDir,
      force,
      dryRun,
    });

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (dryRun) {
      const envStatus = await getProjectEnvStatus(targetDir);
      console.log(pc.bold("\nProvider:"));
      console.log(`  ${result.providerName}`);
      console.log("");
      console.log(pc.bold("Configuration:"));
      console.log(`  ${pc.green("✓")} Framework detected: Next.js`);
      console.log(`  ${pc.green("✓")} Build command: next build`);
      console.log(`  ${pc.green("✓")} Output configuration: ${selectedProvider === "vercel" ? "Vercel Edge & Serverless Functions" : "Production Output"}`);
      console.log("");
      console.log(pc.bold("Environment:"));
      if (envStatus.variables.length > 0) {
        for (const v of envStatus.variables) {
          const icon = v.present ? pc.green("✓") : pc.red("✗");
          console.log(`  ${icon} ${v.key}`);
        }
      } else {
        console.log(`  ${pc.green("✓")} No special environment variables required.`);
      }
      console.log("");
      console.log(pc.dim("No deployment performed. (Dry run mode)\n"));
      return;
    }

    spinner.stop(`Configured ${result.providerName} deployment`);

    p.log.success(
      `Generated deployment files: ${result.filesWritten.join(", ") || "(none)"}`,
    );

    if (result.scriptsAdded.length) {
      p.log.info(`Added scripts to package.json: ${result.scriptsAdded.join(", ")}`);
    }

    console.log("");
    console.log(pc.bold("Next steps:"));
    for (const instruction of result.instructions) {
      console.log(`  • ${instruction}`);
    }
    console.log("");
  } catch (error) {
    if (!json) spinner.stop("Deployment configuration failed", 1);
    if (json) {
      console.log(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
    } else {
      p.log.error(error instanceof Error ? error.message : String(error));
    }
    process.exitCode = 1;
  }
}

async function runMaintenanceCommand(command: string, args: string[]) {
  const force = args.includes("--force") || args.includes("-f");
  const dryRun = args.includes("--dry-run");
  const json = args.includes("--json");
  const fix = args.includes("--fix");
  const installedOnly = args.includes("--installed");
  const parsed = parseProjectCommandArgs(args.filter((arg) => !["--force", "-f", "--dry-run", "--json", "--fix", "--installed"].includes(arg)));
  if ("error" in parsed) throw new Error(parsed.error);
  const { targetDir, rest } = parsed;
  const output = (value: unknown) => { if (json) console.log(JSON.stringify(value, null, 2)); };

  if (command === "init") {
    const config = await initProject(targetDir, dryRun);
    if (json) {
      output(config);
    } else {
      p.log.success(`Initialized Nova project manifest at .nova/project.json (${config.plugins.length} tracked plugins).`);
    }
    return;
  }

  if (command === "info") {
    const info = await infoProject(targetDir);
    if (json) {
      output(info);
    } else {
      console.log(pc.bold("\nProject Information:\n"));
      console.log(`  ${pc.cyan("Name:")}            ${info.name} (v${info.version})`);
      console.log(`  ${pc.cyan("Type:")}            ${info.projectType}`);
      console.log(`  ${pc.cyan("Package Manager:")} ${info.packageManager}`);
      console.log(`  ${pc.cyan("UI Library:")}      ${info.uiLibrary}`);
      console.log(`  ${pc.cyan("Nova Version:")}    ${info.novaVersion}`);
      console.log(`  ${pc.cyan("Manifest:")}        ${info.manifestLocation}`);
      console.log(`  ${pc.cyan("Core:")}            Next.js ${info.dependencies.next ?? "-"}, React ${info.dependencies.react ?? "-"}, TypeScript ${info.dependencies.typescript ?? "-"}`);
      console.log(`  ${pc.cyan("Structure:")}       ${info.structure.hasSrcDir ? "src/ directory" : "root directory"}, ${info.structure.hasAppRouter ? "App Router" : "Pages Router"}`);
      console.log(`  ${pc.cyan(`Plugins (${info.plugins.length}):`)}     ${info.plugins.map((pl) => pl.name).join(", ") || "none"}`);
      if (info.deployment.configuredProviders.length) {
        console.log(`  ${pc.cyan("Deployment:")}      ${info.deployment.configuredProviders.join(", ")}`);
      }
      console.log("");
    }
    return;
  }

  if (command === "validate") {
    const issues = await validateProject(targetDir);
    if (issues.length) throw new Error(`Validation failed:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
    if (json) output({ valid: true, issues: [] }); else p.log.success("All plugin constraints and dependencies are valid.");
    return;
  }

  if (command === "doctor") {
    if (fix) {
      const repairResult = await repairProject(targetDir, { dryRun });
      if (!json) {
        if (repairResult.repairedFiles.length) {
          p.log.success(`Auto-repaired: ${repairResult.repairedFiles.join(", ")}`);
        } else {
          p.log.info("No auto-repairable drift found.");
        }
      }
    }

    const result = await doctorProject(targetDir);
    if (json) {
      output(result);
    } else {
      console.log(pc.bold("\nNova Doctor Diagnostics:\n"));
      for (const check of result.checks) {
        const symbol = check.status === "pass" ? pc.green("✓") : check.status === "warn" ? pc.yellow("▲") : pc.red("✖");
        console.log(`  ${symbol} ${pc.dim(`[${check.category}]`)} ${check.message}`);
      }
      console.log("");
      if (result.errors.length) {
        throw new Error(`Doctor found ${result.errors.length} error(s). Please resolve them to ensure project health.`);
      } else if (result.warnings.length) {
        p.log.warn(`Doctor passed with ${result.warnings.length} warning(s).`);
      } else {
        p.log.success("All health checks passed!");
      }
    }
    return;
  }

  if (command === "status") {
    const status = await statusProject(targetDir);
    if (json) {
      output(status);
    } else {
      console.log(pc.bold("\nNova Project\n"));
      if (status.template) console.log(`  ${pc.cyan("Template:")}       ${status.template}`);
      if (status.preset) console.log(`  ${pc.cyan("Preset:")}         ${status.preset}`);
      console.log(`  ${pc.cyan("UI:")}             ${status.uiLibrary}`);
      console.log(`  ${pc.cyan("Database:")}       ${status.architecture.database}`);
      console.log(`  ${pc.cyan("Authentication:")} ${status.architecture.auth}`);
      console.log(`  ${pc.cyan("API:")}            ${status.architecture.api}`);
      console.log(`  ${pc.cyan("Testing:")}        ${status.architecture.testing}`);
      if (status.architecture.ai !== "None") {
        console.log(`  ${pc.cyan("AI:")}             ${status.architecture.ai}`);
      }
      console.log(`  ${pc.cyan("Plugins:")}        ${status.pluginsCount}`);
      console.log(`  ${pc.cyan("Package Manager:")} ${status.packageManager}`);
      console.log(`  ${pc.cyan("Nova:")}           ${status.novaVersion}`);
      console.log(`  ${pc.cyan("Git:")}            ${status.hasGit ? "initialized" : "not initialized"}`);
      console.log(`  ${pc.cyan("Environment:")}    ${status.hasEnvFile ? ".env present" : "no .env (copy from .env.example)"}`);
      console.log(`  ${pc.cyan("Health:")}         ${status.health.isHealthy ? pc.green(`Healthy (0 errors, ${status.health.warningsCount} warnings)`) : pc.red(`Issues found (${status.health.errorsCount} errors, ${status.health.warningsCount} warnings)`)}`);
      console.log("");
      if (!status.health.isHealthy) process.exitCode = 1;
    }
    return;
  }

  if (command === "clean") {
    const found = await cleanProject(targetDir, dryRun);
    if (json) {
      output({ dryRun, paths: found });
    } else if (found.length) {
      p.log.success(`${dryRun ? "Would remove" : "Removed"} caches: ${found.join(", ")}`);
    } else {
      p.log.info("No generated caches found.");
    }
    return;
  }

  if (command === "diff") {
    const pluginFilter = rest[0];
    const findings = await diffProject(targetDir, pluginFilter);
    if (json) {
      output({ drift: findings });
    } else if (!findings.length) {
      p.log.success("No baseline drift detected. Project configuration is in sync with Nova manifests.");
    } else {
      console.log(pc.bold(`\nBaseline Drift Findings (${findings.length}):\n`));
      for (const f of findings) {
        const icon = f.severity === "error" ? pc.red("✖") : f.severity === "warning" ? pc.yellow("▲") : pc.blue("ℹ");
        const classification = f.classification === "SAFE TO REPAIR" ? pc.green(`[${f.classification}]`) : f.classification === "MANUAL REVIEW REQUIRED" ? pc.yellow(`[${f.classification}]`) : pc.cyan(`[${f.classification}]`);
        console.log(`  ${icon} ${classification} ${f.description}`);
        console.log(`    ${pc.dim("Fix:")} ${f.remediation}`);
      }
      console.log("");
    }
    return;
  }

  if (command === "remove") {
    if (!rest.length) throw new Error("Usage: nova remove <plugin...> [--path <dir>] [--force] [--dry-run]");
    const result = await removePlugins(targetDir, rest, { force, dryRun });
    if (result.skipped.length) p.log.warn(`Not tracked by Nova: ${result.skipped.join(", ")}`);
    if (!result.removed.length) throw new Error("No tracked plugins were removed.");
    if (json) {
      output(result);
    } else {
      const prefix = dryRun ? "[DRY RUN] Would remove" : "Removed";
      p.log.success(`${prefix} plugin metadata and package entries: ${result.removed.join(", ")}`);
      p.log.warn("Generated source files are preserved to avoid deleting user modifications.");
    }
    return;
  }

  if (command === "upgrade") {
    const result = await upgradeProject(targetDir, { dryRun, plugins: rest });
    const totalUpdates = result.updatedDependencies.length + result.updatedDevDependencies.length + result.addedScripts.length;
    if (json) {
      output(result);
    } else if (!totalUpdates) {
      p.log.success("Project dependencies and scripts are already up to date.");
    } else {
      const prefix = dryRun ? "[DRY RUN] Would update" : "Updated";
      if (result.updatedDependencies.length) {
        p.log.info(`${prefix} dependencies: ${result.updatedDependencies.map((d) => `${d.name} (${d.from ?? "missing"} -> ${d.to})`).join(", ")}`);
      }
      if (result.updatedDevDependencies.length) {
        p.log.info(`${prefix} devDependencies: ${result.updatedDevDependencies.map((d) => `${d.name} (${d.from ?? "missing"} -> ${d.to})`).join(", ")}`);
      }
      if (result.addedScripts.length) {
        p.log.info(`${prefix} scripts: ${result.addedScripts.map((s) => `${s.name} ("${s.command}")`).join(", ")}`);
      }
      if (!dryRun) p.log.success(`Upgrade completed (${totalUpdates} changes applied).`);
    }
    return;
  }

  if (command === "repair") {
    const result = await repairProject(targetDir, { dryRun });
    if (json) {
      output(result);
    } else if (!result.repairedFiles.length) {
      p.log.success("Project configuration is clean. Nothing needed repair.");
    } else {
      const prefix = dryRun ? "[DRY RUN] Would repair" : "Repaired";
      p.log.success(`${prefix} files: ${result.repairedFiles.join(", ")}`);
      if (result.restoredScripts.length) p.log.info(`Restored scripts: ${result.restoredScripts.join(", ")}`);
      if (result.restoredEnvKeys.length) p.log.info(`Restored environment keys: ${result.restoredEnvKeys.join(", ")}`);
    }
    return;
  }

  if (command === "list" || command === "search") {
    const query = rest.join(" ").trim();
    if (command === "search" && !query) throw new Error("Usage: nova search <term>");

    if (installedOnly) {
      const plugins = await listInstalledPlugins(targetDir);
      if (json) { output(plugins); return; }
      if (!plugins.length) { console.log("No matching plugins."); return; }
      for (const plugin of plugins) console.log(`${plugin.key.padEnd(18)} ${plugin.metadata.name} — ${plugin.metadata.description}`);
      return;
    }

    const registryManager = getPluginRegistryManager();
    const results = await registryManager.search(query);

    if (json) { output(results); return; }
    if (!results.length) { console.log(`No matching plugins for: "${query}".`); return; }

    console.log(pc.bold("\nNova Plugin Registry\n"));

    const grouped = new Map<string, typeof results>();
    for (const res of results) {
      const cat = res.plugin.category ? res.plugin.category.charAt(0).toUpperCase() + res.plugin.category.slice(1) : "General";
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(res);
    }

    for (const [cat, items] of grouped.entries()) {
      console.log(pc.bold(pc.cyan(cat)));
      console.log("");
      for (const item of items) {
        const badge = formatTrustBadge(item.plugin.trustLevel);
        console.log(`${badge} ${pc.bold(item.plugin.id)}`);
        console.log(`  ${item.plugin.description}`);
        console.log("");
      }
    }
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

export async function run() {
  const rawArgs = process.argv.slice(2);

  if (rawArgs.includes("-h") || rawArgs.includes("--help")) {
    printHelp();
    return;
  }

  if (rawArgs.includes("-v") || rawArgs.includes("--version")) {
    console.log(readPackageVersion());
    return;
  }

  // Subcommand dispatch
  const first = rawArgs[0];

  if (first === "plugin") {
    try {
      await runPluginSubcommand(rawArgs.slice(1));
    } catch (err) {
      p.log.error(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
    return;
  }

  if (first === "template" || first === "templates") {
    try {
      await runTemplateSubcommand(rawArgs.slice(1));
    } catch (err) {
      p.log.error(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
    return;
  }

  if (first === "presets" || first === "preset") {
    try {
      await runTemplateSubcommand(["presets", ...rawArgs.slice(1)]);
    } catch (err) {
      p.log.error(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
    return;
  }

  if (first === "env") {
    try {
      await runEnvSubcommand(rawArgs.slice(1));
    } catch (err) {
      p.log.error(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
    return;
  }

  if (first === "add") {
    await runAddCommand(rawArgs.slice(1));
    return;
  }

  if (first === "plugins") {
    runPluginsCommand(rawArgs.slice(1));
    return;
  }

  if (first === "deploy" || first === "deployment") {
    await runDeployCommand(rawArgs.slice(1));
    return;
  }

  if (["init", "info", "status", "doctor", "validate", "clean", "diff", "remove", "list", "search", "upgrade", "repair"].includes(first ?? "")) {
    try {
      await runMaintenanceCommand(first, rawArgs.slice(1));
    } catch (error) {
      p.log.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
    return;
  }

  if (first === "react-native" || first === "mobile") {
    await runMobileFlow(rawArgs[1]);
    return;
  }

  // Project Creation Flow (nova create <name> or nova <name>)
  const createArgs = first === "create" ? rawArgs.slice(1) : rawArgs;

  let templateArg: string | undefined;
  let presetArg: string | undefined;
  let uiArg: UiLibrary | undefined;
  let pmArg: PackageManager | undefined;
  let yesArg = false;
  let projectNameArg: string | undefined;
  const featuresArg: string[] = [];

  for (let i = 0; i < createArgs.length; i++) {
    const arg = createArgs[i];
    if (arg === "--template" || arg === "-t") {
      templateArg = createArgs[++i];
    } else if (arg === "--preset") {
      presetArg = createArgs[++i];
    } else if (arg === "--ui") {
      uiArg = createArgs[++i] as UiLibrary;
    } else if (arg === "--package-manager" || arg === "--pm") {
      pmArg = createArgs[++i] as PackageManager;
    } else if (arg === "--yes" || arg === "-y") {
      yesArg = true;
    } else if (arg === "--features") {
      const feats = createArgs[++i]?.split(",") ?? [];
      featuresArg.push(...feats);
    } else if (!arg.startsWith("-") && !projectNameArg) {
      projectNameArg = arg;
    }
  }

  if (templateArg === "react-native" || templateArg === "expo" || templateArg === "mobile") {
    await runMobileFlow(projectNameArg);
    return;
  }

  let answers;
  try {
    answers = await collectAnswers(projectNameArg, {
      template: templateArg,
      preset: presetArg,
      uiLibrary: uiArg,
      packageManager: pmArg,
      yes: yesArg,
      features: featuresArg,
    });
  } catch (error) {
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  const spinner = p.spinner();
  spinner.start("Generating project");

  let result;
  try {
    result = await generateProject(answers, {
      onStep: (step) => spinner.message(step),
    });
  } catch (error) {
    spinner.stop("Generation failed", 1);
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  spinner.stop("Project files generated");

  if (answers.initGit) {
    try {
      await execa("git", ["init"], { cwd: result.targetDir });
      await execa("git", ["add", "-A"], { cwd: result.targetDir });
      await execa("git", ["commit", "-m", "chore: initial commit from nova"], {
        cwd: result.targetDir,
      });
      p.log.success("Initialized git repository");
    } catch {
      p.log.warn("Could not initialize git automatically (is git installed?)");
    }
  }

  if (answers.installNow) {
    const installSpinner = p.spinner();
    installSpinner.start(`Installing dependencies with ${answers.packageManager}`);
    try {
      // Plugin-declared beforeInstall/afterInstall hooks bracket the actual
      // package-manager install. These live outside generateProject()
      // itself (installation is a CLI-level concern, driven by the
      // "install now?" prompt), which is why generateProject() returns
      // pluginRegistry/pluginContext - so this call site can invoke them
      // without re-deriving the enabled plugin list or rebuilding the
      // registry.
      await runPluginHook(
        "beforeInstall",
        result.pluginContext.enabledPlugins,
        result.pluginRegistry,
        result.pluginContext,
      );
      await execa(answers.packageManager, ["install"], { cwd: result.targetDir });
      await runPluginHook(
        "afterInstall",
        result.pluginContext.enabledPlugins,
        result.pluginRegistry,
        result.pluginContext,
      );
      installSpinner.stop("Dependencies installed");
    } catch (error) {
      installSpinner.stop("Dependency installation failed", 1);
      p.log.error(error instanceof Error ? error.message : String(error));
      p.log.warn(
        `Run "${installCommand(answers.packageManager)}" manually inside ${answers.projectName}.`,
      );
    }
  }

  p.outro(pc.green("Done!"));

  console.log("");
  console.log(pc.bold("Next steps:"));
  console.log(`  cd ${answers.projectName}`);
  console.log(`  cp .env.example .env   ${pc.dim("# fill in real values")}`);
  if (!answers.installNow) console.log(`  ${installCommand(answers.packageManager)}`);
  console.log(`  ${devCommand(answers.packageManager)}`);
  console.log("");
  console.log(pc.dim("See docs/folder-structure.md to get oriented."));
}

async function runMobileFlow(cliProjectName?: string) {
  p.intro(pc.bgCyan(pc.black(" nova mobile ")));

  if (cliProjectName && !isValidProjectName(cliProjectName)) {
    p.log.error(
      `Invalid project name "${cliProjectName}". Use only letters, numbers, dashes, or underscores.`,
    );
    process.exit(1);
  }

  const projectNameInput = cliProjectName ?? (await p.text({
    message: "What is your mobile app named?",
    placeholder: "my-mobile-app",
    validate: (value) => {
      if (!value) return "Project name is required";
      if (!isValidProjectName(value)) {
        return "Use letters, numbers, dashes or underscores only";
      }
    },
  }));

  bail(projectNameInput);
  const projectName = projectNameInput;

  const packageManagerInput = await p.select<PackageManager>({
    message: "Which package manager do you want to use?",
    options: [
      { value: "npm", label: "npm (recommended for Expo)" },
      { value: "pnpm", label: "pnpm" },
      { value: "yarn", label: "yarn" },
      { value: "bun", label: "bun" },
    ],
  });
  bail(packageManagerInput);
  const packageManager = packageManagerInput;

  let installNow = false;
  if (!process.env.CI) {
    const installNowInput = await p.confirm({
      message: "Install dependencies now?",
      initialValue: true,
    });
    bail(installNowInput);
    installNow = installNowInput;
  }

  const initGitInput = await p.confirm({
    message: "Initialize a git repository?",
    initialValue: true,
  });
  bail(initGitInput);
  const initGit = initGitInput;

  const spinner = p.spinner();
  spinner.start("Generating React Native project");

  let result;
  try {
    result = await generateMobileProject(
      {
        projectName,
        projectType: "react-native",
        packageManager,
        uiLibrary: "headless",
        installNow,
        initGit,
        features: {} as any,
      },
      {
        onStep: (step) => spinner.message(step),
      },
    );
  } catch (error) {
    spinner.stop("Generation failed", 1);
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  spinner.stop("Mobile project generated");

  if (initGit) {
    try {
      await execa("git", ["init"], { cwd: result.targetDir });
      await execa("git", ["add", "-A"], { cwd: result.targetDir });
      await execa("git", ["commit", "-m", "chore: initial commit from nova"], {
        cwd: result.targetDir,
      });
      p.log.success("Initialized git repository");
    } catch {
      p.log.warn("Could not initialize git automatically (is git installed?)");
    }
  }

  if (installNow) {
    const installSpinner = p.spinner();
    installSpinner.start(`Installing dependencies with ${packageManager}`);
    try {
      await execa(packageManager, ["install"], { cwd: result.targetDir });
      installSpinner.stop("Dependencies installed");
    } catch (error) {
      installSpinner.stop("Dependency installation failed", 1);
      p.log.error(error instanceof Error ? error.message : String(error));
      p.log.warn(`Run "${installCommand(packageManager)}" manually inside ${projectName}.`);
    }
  }

  p.outro(pc.green("Done!"));

  console.log("");
  console.log(pc.bold("Next steps:"));
  console.log(`  cd ${projectName}`);
  if (!installNow) console.log(`  ${installCommand(packageManager)}`);
  console.log(`  ${packageManager === "npm" ? "npm start" : `${packageManager} start`}`);
  console.log("");
  console.log(pc.dim("Press 'i' for iOS Simulator, 'a' for Android Emulator, 'w' for Web"));
  console.log(pc.dim("See docs/mobile.md to get oriented."));
}

export {
  addFeaturesToProject,
  cleanProject,
  diffProject,
  doctorProject,
  generateDeploymentConfig,
  generateMobileProject,
  generateProject,
  getPluginConflicts,
  getPluginTree,
  infoProject,
  initProject,
  listAllPluginInfo,
  listDeploymentProviders,
  listInstalledPlugins,
  listPlugins,
  removePlugins,
  repairProject,
  runDeployCommand,
  runMobileFlow,
  statusProject,
  upgradeProject,
  validateProject,
  runPluginSubcommand,
  runTemplateSubcommand,
  runEnvSubcommand,
};

export * from "./registry/index.js";
export * from "./presets/registry.js";
export * from "./templates/registry.js";
export * from "./sdk/index.js";
export * from "./env/manager.js";





