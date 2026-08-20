import * as p from "@clack/prompts";
import path from "node:path";
import pc from "picocolors";
import {
  createDefaultInfrastructureConfig,
  getInfrastructureRegistry,
  readInfrastructureConfig,
  writeInfrastructureConfig,
  type InfrastructureApplyOptions,
  type InfrastructureContext,
  type InfrastructureDestroyOptions,
  type InfrastructureEnvironment,
  type InfrastructureProviderId,
  type InfrastructureScaleOptions,
} from "../infrastructure/index.js";
import { readProjectConfig, readProjectPackage } from "../project.js";
import type { UiLibrary } from "../types.js";

export interface InfraCommandArgs {
  subcommand: "providers" | "validate" | "plan" | "apply" | "destroy" | "status" | "diff" | "drift" | "scale" | "help";
  targetDir: string;
  provider?: InfrastructureProviderId;
  environment?: InfrastructureEnvironment;
  namespace?: string;
  replicas?: number;
  dryRun: boolean;
  force: boolean;
  yes: boolean;
  json: boolean;
  confirmationPhrase?: string;
}

export function parseInfraArgs(args: string[]): InfraCommandArgs | { error: string } {
  let subcommand: InfraCommandArgs["subcommand"] = "help";
  let targetDir = process.cwd();
  let provider: InfrastructureProviderId | undefined;
  let environment: InfrastructureEnvironment | undefined;
  let namespace: string | undefined;
  let replicas: number | undefined;
  let dryRun = false;
  let force = false;
  let yes = false;
  let json = false;
  let confirmationPhrase: string | undefined;

  const validSubcommands = new Set([
    "providers",
    "validate",
    "plan",
    "apply",
    "destroy",
    "status",
    "diff",
    "drift",
    "scale",
    "help",
  ]);

  let i = 0;
  if (args.length > 0 && validSubcommands.has(args[0])) {
    subcommand = args[0] as InfraCommandArgs["subcommand"];
    i = 1;
  }

  for (; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--path" || arg === "-p") {
      if (!args[i + 1]) return { error: "--path requires a directory argument" };
      targetDir = path.resolve(args[++i]);
    } else if (arg === "--provider") {
      if (!args[i + 1]) return { error: "--provider requires a provider id argument" };
      provider = args[++i].toLowerCase() as InfrastructureProviderId;
    } else if (arg === "--env" || arg === "--environment") {
      if (!args[i + 1]) return { error: "--env requires an environment argument" };
      environment = args[++i].toLowerCase() as InfrastructureEnvironment;
    } else if (arg === "--namespace" || arg === "-n") {
      if (!args[i + 1]) return { error: "--namespace requires an argument" };
      namespace = args[++i];
    } else if (arg === "--replicas") {
      if (!args[i + 1]) return { error: "--replicas requires a number argument" };
      replicas = parseInt(args[++i], 10);
      if (isNaN(replicas) || replicas < 1) return { error: "--replicas must be a positive integer" };
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--force" || arg === "-f") {
      force = true;
    } else if (arg === "--yes" || arg === "-y") {
      yes = true;
    } else if (arg === "--json") {
      json = true;
    } else if (arg === "--confirm") {
      if (!args[i + 1]) return { error: "--confirm requires a confirmation phrase" };
      confirmationPhrase = args[++i];
    } else if (arg.startsWith("-")) {
      return { error: `Unknown option: ${arg}` };
    }
  }

  return {
    subcommand,
    targetDir,
    provider,
    environment,
    namespace,
    replicas,
    dryRun,
    force,
    yes,
    json,
    confirmationPhrase,
  };
}

async function getInfraContext(
  targetDir: string,
  overrides?: {
    provider?: InfrastructureProviderId;
    environment?: InfrastructureEnvironment;
    namespace?: string;
  },
): Promise<InfrastructureContext> {
  const pkg = await readProjectPackage(targetDir);
  const projectConfig = await readProjectConfig(targetDir);
  const existingInfra = await readInfrastructureConfig(targetDir);
  const appName = String(pkg.name ?? path.basename(targetDir));

  const config =
    existingInfra ??
    createDefaultInfrastructureConfig({
      appName,
      provider: overrides?.provider ?? "kubernetes",
      environment: overrides?.environment ?? "production",
      namespace: overrides?.namespace,
    });

  if (overrides?.provider) config.provider = overrides.provider;
  if (overrides?.environment) config.environment = overrides.environment;
  if (overrides?.namespace) config.namespace = overrides.namespace;

  return {
    targetDir,
    projectName: appName,
    packageManager: projectConfig?.packageManager ?? "npm",
    uiLibrary: (projectConfig?.uiLibrary ?? "shadcn") as UiLibrary,
    plugins: projectConfig?.plugins ?? [],
    config,
  };
}

export async function runInfraSubcommand(args: string[]): Promise<void> {
  const parsed = parseInfraArgs(args);
  if ("error" in parsed) {
    console.error(pc.red(parsed.error));
    process.exitCode = 1;
    return;
  }

  const registry = getInfrastructureRegistry();
  const { subcommand, targetDir, dryRun, force, yes, json, replicas } = parsed;

  if (subcommand === "help") {
    printInfraHelp();
    return;
  }

  // 1. nova infra providers
  if (subcommand === "providers") {
    const list = registry.list();
    if (json) {
      console.log(
        JSON.stringify(
          list.map((p) => ({ id: p.id, name: p.name, description: p.description, documentationUrl: p.documentationUrl })),
          null,
          2,
        ),
      );
      return;
    }

    console.log(pc.bold("\nNova Infrastructure Providers:\n"));
    for (const provider of list) {
      console.log(`  ${pc.cyan(pc.bold(provider.id.padEnd(16)))} ${pc.white(provider.name)}`);
      console.log(`  ${"".padEnd(16)} ${pc.gray(provider.description)}`);
      if (provider.documentationUrl) {
        console.log(`  ${"".padEnd(16)} ${pc.dim(provider.documentationUrl)}`);
      }
      console.log();
    }
    return;
  }

  const context = await getInfraContext(targetDir, {
    provider: parsed.provider,
    environment: parsed.environment,
    namespace: parsed.namespace,
  });
  const provider = registry.requireProvider(context.config.provider);

  // 2. nova infra validate
  if (subcommand === "validate") {
    const result = await provider.validate(context, { checkSecurity: true });
    if (json) {
      console.log(JSON.stringify(result, null, 2));
      if (!result.ok) process.exitCode = 1;
      return;
    }

    console.log(pc.bold(`\nInfrastructure Validation (${provider.name}):\n`));
    if (result.ok) {
      console.log(pc.green("  ✓ All infrastructure configurations and manifests are valid."));
    } else {
      console.log(pc.red("  ✗ Validation errors encountered:"));
      for (const err of result.errors) console.log(pc.red(`    - ${err}`));
      process.exitCode = 1;
    }

    if (result.warnings.length > 0) {
      console.log(pc.yellow("\n  Warnings / Security Recommendations:"));
      for (const w of result.warnings) console.log(pc.yellow(`    ⚠ ${w}`));
    }

    if (result.security) {
      console.log(pc.cyan(`\n  Security Health Score: ${result.security.score}/100`));
    }
    console.log();
    return;
  }

  // 3. nova infra plan
  if (subcommand === "plan") {
    const plan = await provider.plan(context);
    if (json) {
      console.log(JSON.stringify(plan, null, 2));
      return;
    }

    console.log(pc.bold(`\nInfrastructure Plan (${provider.name})\n`));
    console.log(`  ${pc.cyan("Provider:")}    ${plan.providerName}`);
    console.log(`  ${pc.cyan("Environment:")} ${plan.environment}`);
    if (plan.namespace) console.log(`  ${pc.cyan("Namespace:")}   ${plan.namespace}`);
    if (plan.context) console.log(`  ${pc.cyan("Context:")}     ${plan.context}`);
    console.log(`  ${pc.cyan("Risk Level:")}  ${plan.risk === "high" ? pc.red("High") : pc.yellow("Medium")}`);

    console.log(pc.bold("\nPlanned Resources:"));
    for (const res of plan.resources) {
      const actionIcon =
        res.action === "create"
          ? pc.green("+")
          : res.action === "update"
          ? pc.yellow("~")
          : res.action === "delete"
          ? pc.red("-")
          : pc.gray("•");
      console.log(`  ${actionIcon} ${pc.bold(res.type.padEnd(24))} ${res.name} ${pc.gray(`(${res.details || res.action})`)}`);
    }

    console.log(
      pc.bold(
        `\nChanges: ${pc.green(`${plan.summary.create} to create`)}, ${pc.yellow(
          `${plan.summary.update} to update`,
        )}, ${pc.red(`${plan.summary.delete} to delete`)}`,
      ),
    );

    if (plan.warnings.length > 0) {
      console.log(pc.yellow("\nWarnings:"));
      for (const w of plan.warnings) console.log(pc.yellow(`  ⚠ ${w}`));
    }

    console.log(pc.gray("\nNo changes have been applied. Run 'nova infra apply' to execute.\n"));
    return;
  }

  // 4. nova infra apply
  if (subcommand === "apply") {
    const plan = await provider.plan(context);

    // Production safeguards
    if (context.config.environment === "production" && !yes && !dryRun) {
      p.intro(pc.bgRed(pc.black(" PRODUCTION INFRASTRUCTURE APPLY ")));
      p.log.warn(
        `You are applying changes to PRODUCTION infrastructure in namespace: ${pc.bold(
          context.config.namespace || "default",
        )}`,
      );

      const confirm = await p.confirm({
        message: `Apply ${plan.summary.total} infrastructure resources to PRODUCTION?`,
        initialValue: false,
      });

      if (p.isCancel(confirm) || !confirm) {
        p.cancel("Operation cancelled by user.");
        return;
      }
    }

    const options: InfrastructureApplyOptions = {
      targetDir,
      dryRun,
      force,
      yes,
      replicas,
      namespace: parsed.namespace,
    };

    const result = await provider.apply(plan, context, options);
    await writeInfrastructureConfig(targetDir, context.config);

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (dryRun) {
      console.log(pc.yellow(`\n[DRY RUN] Would write ${result.filesWritten.length} files:`));
      for (const f of result.filesWritten) console.log(`  + ${f}`);
      return;
    }

    console.log(pc.green(`\n✓ Infrastructure successfully applied (${provider.name})`));
    for (const f of result.filesWritten) console.log(pc.green(`  + Written: ${f}`));
    for (const s of result.filesSkipped) console.log(pc.gray(`  • Skipped (exists): ${s}`));

    console.log(pc.bold("\nNext Steps:"));
    for (const inst of result.instructions) console.log(`  - ${inst}`);
    console.log();
    return;
  }

  // 5. nova infra destroy
  if (subcommand === "destroy") {
    if (context.config.environment === "production" && !force) {
      p.intro(pc.bgRed(pc.black(" DANGER: DESTROY PRODUCTION INFRASTRUCTURE ")));
      p.log.error(
        pc.bold(
          "You are about to destroy PRODUCTION infrastructure.\nThis operation may permanently remove deployed workloads and services.",
        ),
      );

      const typed = await p.text({
        message: 'To confirm destruction, type "DESTROY PRODUCTION":',
        validate: (value) => (value === "DESTROY PRODUCTION" ? undefined : 'Type exact phrase "DESTROY PRODUCTION" to proceed.'),
      });

      if (p.isCancel(typed) || typed !== "DESTROY PRODUCTION") {
        p.cancel("Destruction cancelled.");
        return;
      }
    }

    const options: InfrastructureDestroyOptions = {
      targetDir,
      dryRun,
      force,
      environment: context.config.environment,
    };

    const destroyResult = await provider.destroy(context, options);
    if (json) {
      console.log(JSON.stringify(destroyResult, null, 2));
      return;
    }

    console.log(pc.red(`\n✓ Infrastructure destroyed (${provider.name})`));
    for (const f of destroyResult.filesRemoved) console.log(pc.red(`  - Removed: ${f}`));
    console.log();
    return;
  }

  // 6. nova infra status
  if (subcommand === "status") {
    const status = await provider.status(context);
    if (json) {
      console.log(JSON.stringify(status, null, 2));
      return;
    }

    console.log(pc.bold(`\nInfrastructure Status (${provider.name})\n`));
    console.log(`  ${pc.cyan("Provider:")}    ${status.providerName}`);
    console.log(`  ${pc.cyan("Environment:")} ${status.environment}`);
    if (status.namespace) console.log(`  ${pc.cyan("Namespace:")}   ${status.namespace}`);
    console.log(`  ${pc.cyan("Overall:")}     ${status.healthy ? pc.green("Healthy") : pc.red("Degraded")}`);

    console.log(pc.bold("\nResources:"));
    for (const res of status.resources) {
      const icon = res.status === "Ready" || res.status === "Available" ? pc.green("✓") : pc.yellow("⏳");
      console.log(`  ${icon} ${pc.bold(res.type.padEnd(20))} ${res.name.padEnd(24)} ${pc.gray(res.message || res.status)}`);
    }
    console.log();
    return;
  }

  // 7. nova infra diff & drift
  if (subcommand === "diff" || subcommand === "drift") {
    const diffResult = await provider.diff(context);
    if (json) {
      console.log(JSON.stringify(diffResult, null, 2));
      return;
    }

    console.log(pc.bold(`\nInfrastructure Drift Detection (${provider.name})\n`));
    if (!diffResult.hasDrift) {
      console.log(pc.green("  ✓ Infrastructure is fully synchronized with desired configuration."));
    } else {
      console.log(pc.yellow("  ⚠ Drift detected between desired configuration and active state:"));
      for (const res of diffResult.resources) {
        if (res.status !== "synchronized") {
          console.log(`    - ${pc.bold(res.resourceType)} ${res.resourceName}: status is ${pc.yellow(res.status)}`);
          for (const d of res.differences) {
            console.log(`      * ${d.field}: desired=${JSON.stringify(d.desired)}, actual=${JSON.stringify(d.actual)}`);
          }
        }
      }
      if (diffResult.remediation) {
        console.log(pc.cyan(`\n  Remediation: ${diffResult.remediation}`));
      }
    }
    console.log();
    return;
  }

  // 8. nova infra scale
  if (subcommand === "scale") {
    if (!replicas) {
      console.error(pc.red("Error: --replicas <number> is required for nova infra scale"));
      process.exitCode = 1;
      return;
    }

    if (!provider.scale) {
      console.error(pc.red(`Error: Provider ${provider.name} does not support scaling operations.`));
      process.exitCode = 1;
      return;
    }

    const scaleOptions: InfrastructureScaleOptions = {
      targetDir,
      replicas,
      dryRun,
    };

    const scaleResult = await provider.scale(context, scaleOptions);
    context.config.settings.replicas = replicas;
    await writeInfrastructureConfig(targetDir, context.config);

    if (json) {
      console.log(JSON.stringify(scaleResult, null, 2));
      return;
    }

    console.log(
      pc.green(
        `\n✓ Scaled workload from ${scaleResult.previousReplicas} to ${scaleResult.targetReplicas} replicas (${provider.name})`,
      ),
    );
    for (const f of scaleResult.filesModified) console.log(pc.green(`  ~ Updated: ${f}`));
    console.log();
  }
}

function printInfraHelp() {
  console.log(`
${pc.bold("nova infra")} - Production Infrastructure as Code and Kubernetes Operations

${pc.bold("Usage")}
  nova infra providers                     List all available infrastructure providers
  nova infra validate [options]            Validate infrastructure manifests and security rules
  nova infra plan [options]                Generate pre-flight execution plan
  nova infra apply [options]               Apply infrastructure configuration
  nova infra status [options]              Inspect live infrastructure health & resources
  nova infra diff [options]                Compare desired configuration against actual state
  nova infra drift [options]               Detect and report infrastructure drift
  nova infra scale --replicas <n>          Scale workload replica count
  nova infra destroy [options]             Tear down infrastructure resources

${pc.bold("Options")}
  --provider <id>          Infrastructure provider: kubernetes, terraform, docker, docker-compose
  --env <environment>      Target environment: local, development, staging, production
  --namespace, -n <name>   Target Kubernetes namespace (default: app name)
  --replicas <number>      Workload replica count
  -p, --path <dir>         Project root directory (default: current directory)
  --dry-run                Simulate operations without writing files or changing resources
  -f, --force              Force overwrite / bypass non-critical prompts
  -y, --yes                Non-interactive auto-confirmation for non-production operations
  --json                   Output machine-readable JSON
`);
}
