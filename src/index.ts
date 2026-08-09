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
import { collectAnswers, FEATURE_OPTIONS, isValidProjectName } from "./prompts.js";

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
    // dist/index.js -> ../package.json resolves correctly both in the repo
    // (tsup output at ./dist) and once installed globally from npm.
    const pkgPath = path.join(__dirname, "..", "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function printHelp() {
  console.log(`
${pc.bold("nova")} - scaffold a production-ready Next.js app

${pc.bold("Usage")}
  nova [project-name] [--template nextjs|react-native]
  nova react-native [project-name]
  nova deploy [provider] [--path <dir>] [--force] [--list]
  nova add <feature...> [options]
  nova plugins [feature]
  nova remove <plugin...> [--path <dir>] [--force]
  nova init | info | doctor | validate | clean | diff [--path <dir>]
  nova status [--path <dir>] [--json]
  nova upgrade | repair [--path <dir>]
  nova list [search-term] | nova list --installed [--path <dir>] | nova search <term>

${pc.bold("Options")}
  -h, --help               Show this help message
  -v, --version            Print the installed version
  -t, --template <name>    Scaffold template: nextjs (default) or react-native

${pc.bold("Add options")}
  --path, -p <dir>   Target an existing project directory (default: current directory)
  --force, -f        Overwrite files that already exist instead of skipping them
  --yes, -y          Skip any selected plugin's own follow-up prompts (use its defaults)
  --dry-run           Preview cleanup without deleting files (nova clean)
  --json              Print structured output for maintenance and discovery commands

${pc.bold("Examples")}
  nova my-app
  nova my-mobile-app --template react-native
  nova react-native my-mobile-app
  nova add prisma redis
  nova add tanstack-query --path ./my-app
  nova plugins
  nova plugins prisma
  nova doctor --path ./my-app
  nova remove prisma --path ./my-app
`);
}


interface ParsedAddArgs {
  features: string[];
  targetPath: string;
  force: boolean;
  yes: boolean;
}

function parseAddArgs(args: string[]): ParsedAddArgs | { error: string } {
  const features: string[] = [];
  let targetPath = process.cwd();
  let force = false;
  let yes = false;

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

    if (arg.startsWith("-")) {
      return { error: `Unknown option: ${arg}` };
    }

    features.push(arg);
  }

  return { features, targetPath, force, yes };
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

  p.intro(pc.bgCyan(pc.black(" nova add ")));

  let { features } = parsed;
  const { targetPath, force, yes } = parsed;

  if (features.length === 0) {
    features = await promptForFeatures();
  }

  const spinner = p.spinner();
  spinner.start("Adding features to project");

  let result;
  try {
    result = await addFeaturesToProject(targetPath, features, {
      force,
      skipPrompts: yes,
      onStep: (step) => spinner.message(step),
    });
  } catch (error) {
    spinner.stop("Failed to add features", 1);
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  if (result.dependencyIssues.length && result.outcomes.length === 0) {
    spinner.stop("Failed to add features", 1);
    for (const issue of result.dependencyIssues) {
      p.log.error(issue);
    }
    process.exitCode = 1;
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
  const target = args[0];

  if (target) {
    const resolved = resolveFeatureKey(target);
    if (!resolved) {
      console.error(`Unknown plugin: "${target}"`);
      console.log(pc.dim("Run `nova plugins` with no argument to see all available plugins."));
      process.exitCode = 1;
      return;
    }

    printPluginSummary(getPluginInfo(resolved));
    return;
  }

  console.log(pc.bold(`Available plugins (${listAllPluginInfo().length})\n`));

  for (const info of listAllPluginInfo()) {
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
  let providerArg: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--path" || arg === "-p") {
      targetDir = path.resolve(process.cwd(), args[++i] || ".");
    } else if (arg === "--force" || arg === "-f") {
      force = true;
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
  spinner.start(`Configuring deployment for ${selectedProvider}`);

  try {
    const result = await generateDeploymentConfig(selectedProvider, {
      targetDir,
      force,
    });

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
    spinner.stop("Deployment configuration failed", 1);
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

async function runMaintenanceCommand(command: string, args: string[]) {
  const force = args.includes("--force") || args.includes("-f");
  const dryRun = args.includes("--dry-run");
  const json = args.includes("--json");
  const installedOnly = args.includes("--installed");
  const parsed = parseProjectCommandArgs(args.filter((arg) => !["--force", "-f", "--dry-run", "--json", "--installed"].includes(arg)));
  if ("error" in parsed) throw new Error(parsed.error);
  const { targetDir, rest } = parsed;
  const output = (value: unknown) => { if (json) console.log(JSON.stringify(value, null, 2)); };

  if (command === "init") {
    const config = await initProject(targetDir);
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
      console.log(pc.bold("\nProject Status:\n"));
      console.log(`  ${pc.cyan("Project:")}         ${status.name} (${status.projectType})`);
      console.log(`  ${pc.cyan("Package Manager:")} ${status.packageManager}`);
      console.log(`  ${pc.cyan("UI Library:")}      ${status.uiLibrary}`);
      console.log(`  ${pc.cyan("Tracked Plugins:")} ${status.pluginsCount} (${status.plugins.join(", ") || "none"})`);
      console.log(`  ${pc.cyan("Git:")}             ${status.hasGit ? "initialized" : "not initialized"}`);
      console.log(`  ${pc.cyan("Environment:")}     ${status.hasEnvFile ? ".env present" : "no .env (copy from .env.example)"}`);
      console.log(`  ${pc.cyan("Health:")}          ${status.health.isHealthy ? pc.green(`Healthy (0 errors, ${status.health.warningsCount} warnings)`) : pc.red(`Issues found (${status.health.errorsCount} errors, ${status.health.warningsCount} warnings)`)}`);
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
    const findings = await diffProject(targetDir);
    if (json) {
      output({ drift: findings });
    } else if (!findings.length) {
      p.log.success("No baseline drift detected. Project configuration is in sync with Nova manifests.");
    } else {
      console.log(pc.bold(`\nBaseline Drift Findings (${findings.length}):\n`));
      for (const f of findings) {
        const icon = f.severity === "error" ? pc.red("✖") : f.severity === "warning" ? pc.yellow("▲") : pc.blue("ℹ");
        console.log(`  ${icon} ${f.description}`);
        console.log(`    ${pc.dim("Fix:")} ${f.remediation}`);
      }
      console.log("");
    }
    return;
  }

  if (command === "remove") {
    if (!rest.length) throw new Error("Usage: nova remove <plugin...> [--path <dir>] [--force]");
    const result = await removePlugins(targetDir, rest, force);
    if (result.skipped.length) p.log.warn(`Not tracked by Nova: ${result.skipped.join(", ")}`);
    if (!result.removed.length) throw new Error("No tracked plugins were removed.");
    if (json) {
      output(result);
    } else {
      p.log.success(`Removed plugin metadata and package entries: ${result.removed.join(", ")}`);
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
    const result = await repairProject(targetDir);
    if (json) {
      output(result);
    } else if (!result.repairedFiles.length) {
      p.log.success("Project configuration is clean. Nothing needed repair.");
    } else {
      p.log.success(`Repaired files: ${result.repairedFiles.join(", ")}`);
      if (result.restoredScripts.length) p.log.info(`Restored scripts: ${result.restoredScripts.join(", ")}`);
      if (result.restoredEnvKeys.length) p.log.info(`Restored environment keys: ${result.restoredEnvKeys.join(", ")}`);
    }
    return;
  }

  if (command === "list" || command === "search") {
    const query = rest.join(" ");
    if (command === "search" && !query) throw new Error("Usage: nova search <term>");
    const plugins = installedOnly ? await listInstalledPlugins(targetDir) : listPlugins(query);
    if (json) { output(plugins); return; }
    if (!plugins.length) { console.log("No matching plugins."); return; }
    for (const plugin of plugins) console.log(`${plugin.key.padEnd(18)} ${plugin.metadata.name} — ${plugin.metadata.description}`);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

export async function run() {
  const args = process.argv.slice(2);

  if (args.includes("-h") || args.includes("--help")) {
    printHelp();
    return;
  }

  if (args.includes("-v") || args.includes("--version")) {
    console.log(readPackageVersion());
    return;
  }

  if (args[0] === "add") {
    await runAddCommand(args.slice(1));
    return;
  }

  if (args[0] === "plugins") {
    runPluginsCommand(args.slice(1));
    return;
  }

  if (args[0] === "deploy" || args[0] === "deployment") {
    await runDeployCommand(args.slice(1));
    return;
  }

  if (["init", "info", "status", "doctor", "validate", "clean", "diff", "remove", "list", "search", "upgrade", "repair"].includes(args[0] ?? "")) {

    try {
      await runMaintenanceCommand(args[0], args.slice(1));
    } catch (error) {
      p.log.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
    return;
  }

  if (args[0] === "react-native" || args[0] === "mobile") {
    await runMobileFlow(args[1]);
    return;
  }

  const templateIdx = args.findIndex((arg) => arg === "--template" || arg === "-t");
  let selectedTemplate: string | undefined;
  const nonTemplateArgs = [...args];
  if (templateIdx !== -1) {
    selectedTemplate = args[templateIdx + 1];
    nonTemplateArgs.splice(templateIdx, 2);
  }

  if (selectedTemplate === "react-native" || selectedTemplate === "expo" || selectedTemplate === "mobile") {
    await runMobileFlow(nonTemplateArgs[0]);
    return;
  }

  const firstArg = nonTemplateArgs[0];

  if (firstArg?.startsWith("-")) {
    console.error(`Unknown option: ${firstArg}\n`);
    printHelp();
    process.exitCode = 1;
    return;
  }

  const cliProjectName = firstArg;


  const answers = await collectAnswers(cliProjectName);

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
};




