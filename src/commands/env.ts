import path from "node:path";
import pc from "picocolors";
import * as p from "@clack/prompts";
import { getProjectEnvStatus, syncProjectEnvExample } from "../env/manager.js";

export async function runEnvSubcommand(args: string[]): Promise<void> {
  const command = args[0];
  const rest = args.slice(1);
  const json = rest.includes("--json");
  const filtered = rest.filter((a) => a !== "--json");

  let targetDir = process.cwd();

  for (let i = 0; i < filtered.length; i++) {
    const arg = filtered[i];
    if (arg === "--path" || arg === "-p") {
      targetDir = path.resolve(process.cwd(), filtered[++i] || ".");
    }
  }

  // nova env check
  if (command === "check") {
    const status = await getProjectEnvStatus(targetDir);

    if (json) {
      console.log(JSON.stringify(status, null, 2));
      if (!status.ok) process.exitCode = 1;
      return;
    }

    if (status.ok) {
      p.log.success(
        `Environment check passed. All ${status.totalRequired} required variable(s) are configured.`,
      );
    } else {
      console.log(pc.bold(pc.red("\nEnvironment check failed.\n")));
      console.log(pc.bold("Missing:"));
      for (const missing of status.missingRequired) {
        console.log(`  ${pc.red("✗")} ${pc.bold(missing)}`);
      }
      console.log("");
      console.log(
        `  ${status.configuredCount} variable(s) configured, ${pc.red(`${status.missingRequired.length} required variable(s) missing`)}.`,
      );
      console.log(pc.dim("  Copy missing variables from .env.example into .env or set them in your environment.\n"));
      process.exitCode = 1;
    }
    return;
  }

  // nova env example
  if (command === "example" || command === "sync") {
    const result = await syncProjectEnvExample(targetDir);

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (result.addedKeys.length > 0) {
      p.log.success(
        `Synchronized .env.example with ${result.addedKeys.length} new variable(s): ${result.addedKeys.join(", ")}`,
      );
    } else {
      p.log.info(".env.example is already up to date with active plugin definitions.");
    }
    return;
  }

  // default: nova env (or nova env list)
  const status = await getProjectEnvStatus(targetDir);

  if (json) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  console.log(pc.bold("\nNova Environment\n"));

  const required = status.variables.filter((v) => v.required);
  const optional = status.variables.filter((v) => !v.required);

  if (required.length > 0) {
    console.log(pc.bold("Required"));
    for (const v of required) {
      const icon = v.present ? pc.green("✓") : pc.red("✗");
      console.log(`  ${icon} ${pc.bold(v.key)}${v.description ? pc.dim(` — ${v.description}`) : ""}`);
    }
    console.log("");
  }

  if (optional.length > 0) {
    console.log(pc.bold("Optional"));
    for (const v of optional) {
      const icon = v.present ? pc.green("✓") : pc.dim("○");
      console.log(`  ${icon} ${v.key}${v.description ? pc.dim(` — ${v.description}`) : ""}`);
    }
    console.log("");
  }

  if (status.variables.length === 0) {
    console.log(pc.dim("  No plugin-declared environment variables for this project.\n"));
  }
}
