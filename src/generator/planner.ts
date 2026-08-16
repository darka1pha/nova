import path from "node:path";
import pc from "picocolors";

import type { PackageResolutionStrategy } from "../resolver/types.js";

export interface ProjectOperationPlan {
  targetDir: string;
  plugins?: string[];
  filesCreated: string[];
  filesModified: string[];
  filesDeleted: string[];
  dependenciesAdded: Record<string, string>;
  dependenciesRemoved: string[];
  devDependenciesAdded: Record<string, string>;
  devDependenciesRemoved: string[];
  scriptsAdded: Record<string, string>;
  scriptsRemoved: string[];
  envAdded: Array<{ key: string; example?: string; description?: string }>;
  patches: Array<{ target: string; label?: string }>;
  manifestAdded: string[];
  manifestRemoved: string[];
  manifestUpdated?: Record<string, unknown>;
  /** Package version resolution metadata (populated during dry-run). */
  resolvedVersions?: Record<string, {
    strategy: PackageResolutionStrategy;
    resolved: string;
    range?: string;
  }>;
}

export function createEmptyPlan(targetDir: string, plugins: string[] = []): ProjectOperationPlan {
  return {
    targetDir,
    plugins,
    filesCreated: [],
    filesModified: [],
    filesDeleted: [],
    dependenciesAdded: {},
    dependenciesRemoved: [],
    devDependenciesAdded: {},
    devDependenciesRemoved: [],
    scriptsAdded: {},
    scriptsRemoved: [],
    envAdded: [],
    patches: [],
    manifestAdded: [],
    manifestRemoved: [],
    resolvedVersions: {},
  };
}

export function formatPlan(plan: ProjectOperationPlan): string {
  const lines: string[] = [];
  const rel = (p: string) => (path.isAbsolute(p) ? path.relative(plan.targetDir, p) : p);

  lines.push(pc.bold(pc.cyan("\nNova Dry Run\n")));
  lines.push(`${pc.bold("Target:")}\n  ${plan.targetDir}\n`);

  if (plan.plugins && plan.plugins.length > 0) {
    lines.push(`${pc.bold("Plugin(s):")}\n  ${plan.plugins.join(", ")}\n`);
  }

  if (plan.filesCreated.length > 0) {
    lines.push(pc.bold("Files to Create:"));
    for (const f of plan.filesCreated) {
      lines.push(`  ${pc.green("+")} ${rel(f)}`);
    }
    lines.push("");
  }

  if (plan.filesModified.length > 0) {
    lines.push(pc.bold("Files to Modify:"));
    for (const f of plan.filesModified) {
      lines.push(`  ${pc.yellow("~")} ${rel(f)}`);
    }
    lines.push("");
  }

  if (plan.filesDeleted.length > 0) {
    lines.push(pc.bold("Files to Delete:"));
    for (const f of plan.filesDeleted) {
      lines.push(`  ${pc.red("-")} ${rel(f)}`);
    }
    lines.push("");
  }

  const depEntries = Object.entries(plan.dependenciesAdded);
  if (depEntries.length > 0) {
    lines.push(pc.bold("Dependencies:"));
    for (const [name, version] of depEntries) {
      lines.push(`  ${pc.green("+")} ${name}${version ? pc.dim(` (${version})`) : ""}`);
    }
    lines.push("");
  }

  if (plan.dependenciesRemoved.length > 0) {
    lines.push(pc.bold("Dependencies to Remove:"));
    for (const name of plan.dependenciesRemoved) {
      lines.push(`  ${pc.red("-")} ${name}`);
    }
    lines.push("");
  }

  const devDepEntries = Object.entries(plan.devDependenciesAdded);
  if (devDepEntries.length > 0) {
    lines.push(pc.bold("Dev Dependencies:"));
    for (const [name, version] of devDepEntries) {
      lines.push(`  ${pc.green("+")} ${name}${version ? pc.dim(` (${version})`) : ""}`);
    }
    lines.push("");
  }

  if (plan.devDependenciesRemoved.length > 0) {
    lines.push(pc.bold("Dev Dependencies to Remove:"));
    for (const name of plan.devDependenciesRemoved) {
      lines.push(`  ${pc.red("-")} ${name}`);
    }
    lines.push("");
  }

  const scriptEntries = Object.entries(plan.scriptsAdded);
  if (scriptEntries.length > 0) {
    lines.push(pc.bold("Scripts:"));
    for (const [name, cmd] of scriptEntries) {
      lines.push(`  ${pc.green("+")} ${name}${cmd ? pc.dim(` ("${cmd}")`) : ""}`);
    }
    lines.push("");
  }

  if (plan.scriptsRemoved.length > 0) {
    lines.push(pc.bold("Scripts to Remove:"));
    for (const name of plan.scriptsRemoved) {
      lines.push(`  ${pc.red("-")} ${name}`);
    }
    lines.push("");
  }

  if (plan.envAdded.length > 0) {
    lines.push(pc.bold("Environment Variables:"));
    for (const e of plan.envAdded) {
      lines.push(`  ${pc.green("+")} ${e.key}${e.example ? pc.dim(`=${e.example}`) : ""}`);
    }
    lines.push("");
  }

  if (plan.patches.length > 0) {
    lines.push(pc.bold("Configuration Patches:"));
    for (const p of plan.patches) {
      lines.push(`  ${pc.yellow("~")} ${rel(p.target)}${p.label ? pc.dim(` (${p.label})`) : ""}`);
    }
    lines.push("");
  }

  if (plan.manifestAdded.length > 0 || plan.manifestRemoved.length > 0) {
    lines.push(pc.bold("Manifest Changes:"));
    for (const p of plan.manifestAdded) {
      lines.push(`  ${pc.green("+")} ${p}`);
    }
    for (const p of plan.manifestRemoved) {
      lines.push(`  ${pc.red("-")} ${p}`);
    }
    lines.push("");
  }

  if (plan.resolvedVersions && Object.keys(plan.resolvedVersions).length > 0) {
    lines.push(pc.bold("Resolved Package Versions:"));
    for (const [name, info] of Object.entries(plan.resolvedVersions)) {
      const strategyLabel = pc.dim(`(${info.strategy})`);
      lines.push(`  ${name} ${pc.green(info.resolved)} ${strategyLabel}${info.range ? pc.dim(` range: ${info.range}`) : ""}`);
    }
    lines.push("");
  }

  lines.push(pc.dim("No files were modified. (Dry run mode)\n"));

  return lines.join("\n");
}
