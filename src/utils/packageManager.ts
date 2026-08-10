import { devCommand, execArgs, installCommand, type PackageManager } from "@nova/core";
import { execa } from "execa";
import fs from "fs-extra";
import path from "node:path";

export type { PackageManager };
export { devCommand, execArgs, installCommand };

export const LOCKFILES: Record<PackageManager, string> = {
  npm: "package-lock.json",
  pnpm: "pnpm-lock.yaml",
  yarn: "yarn.lock",
  bun: "bun.lockb",
};

export async function detectPackageManager(targetDir: string): Promise<PackageManager> {
  if (await fs.pathExists(path.join(targetDir, "pnpm-lock.yaml"))) return "pnpm";
  if (await fs.pathExists(path.join(targetDir, "yarn.lock"))) return "yarn";
  if (await fs.pathExists(path.join(targetDir, "bun.lockb"))) return "bun";
  return "npm";
}

export function getLockfileName(pm: PackageManager): string {
  return LOCKFILES[pm] ?? "package-lock.json";
}

export async function getPackageManagerVersion(pm: PackageManager): Promise<string | undefined> {
  try {
    const { stdout } = await execa(pm, ["--version"]);
    return stdout.trim();
  } catch {
    return undefined;
  }
}

export async function installDependencies(
  targetDir: string,
  pm: PackageManager,
  options: { dryRun?: boolean } = {},
): Promise<void> {
  if (options.dryRun) return;
  const args = pm === "yarn" ? [] : ["install"];
  await execa(pm, args, { cwd: targetDir });
}

export async function addDependencies(
  targetDir: string,
  pm: PackageManager,
  packages: string[],
  options: { dev?: boolean; dryRun?: boolean } = {},
): Promise<void> {
  if (!packages.length || options.dryRun) return;

  let args: string[] = [];
  switch (pm) {
    case "npm":
      args = ["install", ...(options.dev ? ["--save-dev"] : []), ...packages];
      break;
    case "pnpm":
      args = ["add", ...(options.dev ? ["-D"] : []), ...packages];
      break;
    case "yarn":
      args = ["add", ...(options.dev ? ["--dev"] : []), ...packages];
      break;
    case "bun":
      args = ["add", ...(options.dev ? ["-d"] : []), ...packages];
      break;
  }

  await execa(pm, args, { cwd: targetDir });
}

export async function removeDependencies(
  targetDir: string,
  pm: PackageManager,
  packages: string[],
  options: { dryRun?: boolean } = {},
): Promise<void> {
  if (!packages.length || options.dryRun) return;

  let args: string[] = [];
  switch (pm) {
    case "npm":
      args = ["uninstall", ...packages];
      break;
    case "pnpm":
      args = ["remove", ...packages];
      break;
    case "yarn":
      args = ["remove", ...packages];
      break;
    case "bun":
      args = ["remove", ...packages];
      break;
  }

  await execa(pm, args, { cwd: targetDir });
}

export async function runScript(
  targetDir: string,
  pm: PackageManager,
  script: string,
  args: string[] = [],
): Promise<void> {
  const baseArgs = execArgs(pm, script);
  await execa(pm, [...baseArgs, ...args], { cwd: targetDir });
}
