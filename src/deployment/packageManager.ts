import fs from "fs-extra";
import path from "node:path";

import { readProjectConfig } from "../project.js";
import { detectPackageManager, type PackageManager } from "../utils/packageManager.js";

/**
 * Package-manager-specific commands used inside generated deployment
 * configs (CI workflows, platform build commands, Dockerfiles), so a pnpm,
 * yarn, or bun project doesn't get an `npm ci` that fails without a
 * package-lock.json.
 */
export interface DeploymentCommands {
  pm: PackageManager;
  /** Lockfile-respecting install for CI/build environments. */
  install: string;
  /** Runs a package.json script, e.g. `run("build")` -> `pnpm run build`. */
  run(script: string): string;
  /** Command that makes the package manager available on a plain Node image ("" for npm). */
  bootstrap: string;
  /** `bootstrap && install`, or just `install` when no bootstrap is needed. */
  bootstrapAndInstall: string;
  /** GitHub Actions steps (YAML, 6-space indented) to run before actions/setup-node. */
  githubSetupSteps: string;
  /** Value for actions/setup-node's `cache` input, or undefined when unsupported. */
  githubNodeCache?: "npm" | "pnpm" | "yarn";
}

const INSTALL: Record<PackageManager, string> = {
  npm: "npm ci",
  pnpm: "pnpm install --frozen-lockfile",
  yarn: "yarn install --frozen-lockfile",
  bun: "bun install --frozen-lockfile",
};

const BOOTSTRAP: Record<PackageManager, string> = {
  npm: "",
  pnpm: "corepack enable",
  yarn: "corepack enable",
  bun: "npm install -g bun",
};

const GITHUB_SETUP: Record<PackageManager, string> = {
  npm: "",
  pnpm: "      - name: Setup pnpm\n        uses: pnpm/action-setup@v4\n\n",
  yarn: "",
  bun: "      - name: Setup Bun\n        uses: oven-sh/setup-bun@v2\n\n",
};

const GITHUB_CACHE: Record<PackageManager, DeploymentCommands["githubNodeCache"]> = {
  npm: "npm",
  pnpm: "pnpm",
  yarn: "yarn",
  bun: undefined,
};

export function deploymentCommandsFor(pm: PackageManager): DeploymentCommands {
  const bootstrap = BOOTSTRAP[pm];
  return {
    pm,
    install: INSTALL[pm],
    run: (script) => `${pm} run ${script}`,
    bootstrap,
    bootstrapAndInstall: bootstrap ? `${bootstrap} && ${INSTALL[pm]}` : INSTALL[pm],
    githubSetupSteps: GITHUB_SETUP[pm],
    githubNodeCache: GITHUB_CACHE[pm],
  };
}

/**
 * Prefers the package manager recorded in the Nova project manifest (set
 * at generation time, before any lockfile exists), then falls back to
 * lockfile detection.
 */
export async function resolveDeploymentCommands(targetDir: string): Promise<DeploymentCommands> {
  const config = await readProjectConfig(targetDir).catch(() => undefined);
  const pm = config?.packageManager ?? (await detectPackageManager(targetDir));
  return deploymentCommandsFor(pm);
}

/** Renders the `with: cache:` input for actions/setup-node, or nothing. */
export function githubNodeCacheLine(commands: DeploymentCommands): string {
  return commands.githubNodeCache ? `\n          cache: ${commands.githubNodeCache}` : "";
}

const NEXT_CONFIG_FILES = ["next.config.mjs", "next.config.js", "next.config.ts", "next.config.cjs"];

export interface StandaloneOutputResult {
  /** Config file that was (or, in dry-run, would be) patched. */
  patched?: string;
  alreadyEnabled: boolean;
  /** True when no config file was found or its shape wasn't recognized. */
  failed: boolean;
}

/**
 * The standalone Docker image copies `.next/standalone`, which Next.js only
 * emits with `output: "standalone"`. Adds it to the project's next.config
 * when missing.
 */
export async function ensureStandaloneOutput(
  targetDir: string,
  dryRun = false,
): Promise<StandaloneOutputResult> {
  for (const file of NEXT_CONFIG_FILES) {
    const configPath = path.join(targetDir, file);
    if (!(await fs.pathExists(configPath))) continue;

    const content = await fs.readFile(configPath, "utf8");
    if (/output\s*:\s*["']standalone["']/.test(content)) {
      return { alreadyEnabled: true, failed: false };
    }

    const objectStart = /((?:const|let|var)\s+nextConfig(?:\s*:\s*NextConfig)?\s*=\s*\{)/;
    if (!objectStart.test(content)) {
      return { alreadyEnabled: false, failed: true };
    }

    if (!dryRun) {
      await fs.writeFile(configPath, content.replace(objectStart, '$1\n  output: "standalone",'), "utf8");
    }
    return { patched: file, alreadyEnabled: false, failed: false };
  }

  return { alreadyEnabled: false, failed: true };
}
