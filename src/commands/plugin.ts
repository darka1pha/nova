import * as p from "@clack/prompts";
import path from "node:path";
import pc from "picocolors";
import { scaffoldPlugin } from "../sdk/scaffold.js";
import { testPluginPackage } from "../sdk/tester.js";
import { validatePluginPackage } from "../sdk/validator.js";
import { getPluginRegistryManager } from "../registry/index.js";
import type { PluginCategory } from "../plugin/types.js";

export async function runPluginSubcommand(args: string[]): Promise<void> {
  const command = args[0];
  const rest = args.slice(1);
  const json = rest.includes("--json");
  const filtered = rest.filter((a) => a !== "--json");

  let targetDir = process.cwd();
  let nameArg: string | undefined;
  let categoryArg: string | undefined;

  for (let i = 0; i < filtered.length; i++) {
    const arg = filtered[i];
    if (arg === "--path" || arg === "-p") {
      targetDir = path.resolve(process.cwd(), filtered[++i] || ".");
    } else if (arg === "--category" || arg === "-c") {
      categoryArg = filtered[++i];
    } else if (!arg.startsWith("-") && !nameArg) {
      nameArg = arg;
    }
  }

  if (command === "create") {
    let pluginName = nameArg;
    if (!pluginName) {
      const input = await p.text({
        message: "What is your plugin named?",
        placeholder: "my-plugin",
        validate: (val) => (!val ? "Plugin name is required" : undefined),
      });
      if (p.isCancel(input)) {
        p.cancel("Operation cancelled.");
        process.exit(0);
      }
      pluginName = input;
    }

    const spinner = p.spinner();
    if (!json) spinner.start(`Scaffolding Nova plugin: ${pluginName}`);

    try {
      const result = await scaffoldPlugin({
        name: pluginName,
        targetDir,
        category: (categoryArg as PluginCategory) || "developer-experience",
      });

      if (json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        spinner.stop(`Plugin "${pluginName}" created successfully!`);
        console.log("");
        console.log(`  Location: ${pc.cyan(result.pluginDir)}`);
        console.log(`  Files:    ${result.files.length} created`);
        console.log("");
        console.log(pc.bold("Next steps:"));
        console.log(`  cd ${path.basename(result.pluginDir)}`);
        console.log("  npm install");
        console.log("  nova plugin validate");
        console.log("  nova plugin test");
        console.log("");
      }
    } catch (err) {
      if (!json) spinner.stop("Plugin creation failed", 1);
      throw err;
    }
    return;
  }

  if (command === "validate") {
    const target = nameArg ? path.resolve(targetDir, nameArg) : targetDir;
    const report = await validatePluginPackage(target);

    if (json) {
      console.log(JSON.stringify(report, null, 2));
      if (!report.valid) process.exitCode = 1;
      return;
    }

    console.log(pc.bold("\nNova Plugin Validation\n"));
    for (const chk of report.checks) {
      const icon = chk.passed ? pc.green("✓") : pc.red("✖");
      console.log(`  ${icon} ${chk.name}`);
      if (!chk.passed && chk.message) {
        console.log(`    ${pc.red(chk.message)}`);
      }
    }

    if (report.warnings.length) {
      console.log("");
      for (const w of report.warnings) {
        console.log(`  ${pc.yellow("▲")} ${w}`);
      }
    }

    console.log("");
    if (report.valid) {
      p.log.success("Plugin is valid.");
    } else {
      p.log.error(`Plugin validation failed with ${report.errors.length} error(s).`);
      process.exitCode = 1;
    }
    return;
  }

  if (command === "test") {
    const target = nameArg ? path.resolve(targetDir, nameArg) : targetDir;
    const result = await testPluginPackage(target);

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      if (!result.passed) process.exitCode = 1;
      return;
    }

    console.log(pc.bold("\nNova Plugin Test Runner\n"));
    for (const log of result.logs) {
      console.log(`  ${log}`);
    }
    console.log("");

    if (result.passed) {
      p.log.success(`All ${result.totalTests} plugin tests passed.`);
    } else {
      p.log.error(`Plugin test suite failed: ${result.failedTests}/${result.totalTests} tests failed.`);
      process.exitCode = 1;
    }
    return;
  }

  if (command === "build") {
    const target = nameArg ? path.resolve(targetDir, nameArg) : targetDir;
    const report = await validatePluginPackage(target);
    if (!report.valid) {
      throw new Error(`Plugin validation failed prior to build:\n${report.errors.join("\n")}`);
    }

    if (json) {
      console.log(JSON.stringify({ built: true, target }, null, 2));
    } else {
      p.log.success(`Plugin in "${path.basename(target)}" is ready for distribution.`);
    }
    return;
  }

  if (command === "info") {
    const id = nameArg;
    if (!id) {
      throw new Error("Usage: nova plugin info <plugin-id>");
    }

    const registry = getPluginRegistryManager();
    const plugin = await registry.get(id);

    if (!plugin) {
      throw new Error(`Plugin "${id}" not found in registry.`);
    }

    if (json) {
      console.log(JSON.stringify(plugin, null, 2));
      return;
    }

    console.log(pc.bold(`\nPlugin Details: ${pc.cyan(plugin.name)} (${plugin.id})\n`));
    console.log(`  ${pc.dim("Description:")}    ${plugin.description}`);
    console.log(`  ${pc.dim("Version:")}        ${plugin.version}`);
    console.log(`  ${pc.dim("Category:")}       ${plugin.category}`);
    console.log(`  ${pc.dim("Author:")}         ${plugin.author ?? "Unknown"}`);
    console.log(`  ${pc.dim("License:")}        ${plugin.license ?? "MIT"}`);
    console.log(`  ${pc.dim("Trust Level:")}    ${plugin.trustLevel ?? "community"}`);
    console.log(`  ${pc.dim("Compatibility:")}  ${plugin.compatibility?.nova ?? ">=0.1.0"}`);
    console.log(`  ${pc.dim("Capabilities:")}   ${plugin.capabilities?.join(", ") || "(none)"}`);
    console.log(`  ${pc.dim("Requires:")}       ${plugin.requires?.join(", ") || "(none)"}`);
    console.log(`  ${pc.dim("Conflicts:")}      ${plugin.conflicts?.join(", ") || "(none)"}`);
    console.log(`  ${pc.dim("Supported UI:")}   ${plugin.supportedUI?.join(", ") || "All"}`);
    console.log(`  ${pc.dim("Env Variables:")}  ${plugin.env?.map((e) => e.key).join(", ") || "(none)"}`);
    console.log("");
    return;
  }

  throw new Error(`Unknown plugin command: "${command ?? ""}". Use: create, validate, test, build, info`);
}
