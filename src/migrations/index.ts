import fs from "fs-extra";
import path from "node:path";

import { getPluginRegistry } from "../plugin/legacyAdapter.js";
import {
  NOVA_MANIFEST_FILE,
  type NovaProjectConfig,
  readProjectConfig,
  readProjectPackage,
  writeProjectConfig,
} from "../project.js";
import { ProjectTransaction } from "../utils/transaction.js";

export interface MigrationStepResult {
  migrationId: string;
  name: string;
  applied: boolean;
  changes: string[];
}

export interface ProjectMigration {
  id: string;
  name: string;
  description: string;
  detect: (targetDir: string, config: NovaProjectConfig, pkg: Record<string, unknown>) => Promise<boolean>;
  apply: (
    targetDir: string,
    config: NovaProjectConfig,
    pkg: Record<string, unknown>,
    transaction: ProjectTransaction,
    dryRun: boolean,
  ) => Promise<MigrationStepResult>;
}

export const PROJECT_MIGRATIONS: ProjectMigration[] = [
  {
    id: "schema-v1-migration",
    name: "Manifest Schema v1 Normalization",
    description: "Ensures project manifest conforms to schemaVersion 1 with authoritative .nova/project.json",
    detect: async (targetDir, config) => {
      const primaryPath = path.join(targetDir, NOVA_MANIFEST_FILE);
      if (!(await fs.pathExists(primaryPath))) return true;
      return config.schemaVersion !== 1;
    },
    apply: async (targetDir, config, _pkg, transaction, dryRun) => {
      const changes: string[] = [];
      if (!dryRun) {
        await transaction.snapshotFile(NOVA_MANIFEST_FILE);
        await transaction.snapshotFile(".nova.json");
        await writeProjectConfig(targetDir, { ...config, schemaVersion: 1 });
      }
      changes.push("Normalized project manifest to schemaVersion 1 under .nova/project.json");
      return { migrationId: "schema-v1-migration", name: "Manifest Schema v1 Normalization", applied: true, changes };
    },
  },
  {
    id: "proxy-migration",
    name: "Next.js 16 Edge Proxy Migration",
    description: "Migrates legacy middleware.ts to Next.js 16 native proxy.ts architecture",
    detect: async (targetDir) => {
      const legacyMiddlewareSrc = path.join(targetDir, "src/middleware.ts");
      const legacyMiddlewareRoot = path.join(targetDir, "middleware.ts");
      const proxySrc = path.join(targetDir, "src/proxy.ts");
      const proxyRoot = path.join(targetDir, "proxy.ts");

      const hasLegacy = (await fs.pathExists(legacyMiddlewareSrc)) || (await fs.pathExists(legacyMiddlewareRoot));
      const hasProxy = (await fs.pathExists(proxySrc)) || (await fs.pathExists(proxyRoot));

      return hasLegacy && !hasProxy;
    },
    apply: async (targetDir, _config, _pkg, transaction, dryRun) => {
      const changes: string[] = [];
      const legacyMiddlewareSrc = path.join(targetDir, "src/middleware.ts");
      const legacyMiddlewareRoot = path.join(targetDir, "middleware.ts");

      if (await fs.pathExists(legacyMiddlewareSrc)) {
        const dest = path.join(targetDir, "src/proxy.ts");
        if (!dryRun) {
          await transaction.snapshotFile("src/middleware.ts");
          await fs.copy(legacyMiddlewareSrc, dest);
          await fs.remove(legacyMiddlewareSrc);
        }
        changes.push("Migrated src/middleware.ts -> src/proxy.ts");
      } else if (await fs.pathExists(legacyMiddlewareRoot)) {
        const dest = path.join(targetDir, "proxy.ts");
        if (!dryRun) {
          await transaction.snapshotFile("middleware.ts");
          await fs.copy(legacyMiddlewareRoot, dest);
          await fs.remove(legacyMiddlewareRoot);
        }
        changes.push("Migrated middleware.ts -> proxy.ts");
      }

      return { migrationId: "proxy-migration", name: "Next.js 16 Edge Proxy Migration", applied: true, changes };
    },
  },
  {
    id: "env-template-hygiene",
    name: "Plugin Environment Template Hygiene",
    description: "Ensures all active plugin environment variables are documented in .env.example",
    detect: async (targetDir, config) => {
      const envPath = path.join(targetDir, ".env.example");
      if (!(await fs.pathExists(envPath))) return true;
      const content = await fs.readFile(envPath, "utf8");
      const registry = getPluginRegistry();
      for (const pluginId of config.plugins) {
        const manifest = registry.getPlugin(pluginId);
        for (const envDecl of manifest?.env ?? []) {
          if (!content.includes(envDecl.key)) return true;
        }
      }
      return false;
    },
    apply: async (targetDir, config, _pkg, transaction, dryRun) => {
      const changes: string[] = [];
      const envPath = path.join(targetDir, ".env.example");
      let content = (await fs.pathExists(envPath)) ? await fs.readFile(envPath, "utf8") : "# Environment Variables\n";
      const registry = getPluginRegistry();

      for (const pluginId of config.plugins) {
        const manifest = registry.getPlugin(pluginId);
        for (const envDecl of manifest?.env ?? []) {
          if (!content.includes(envDecl.key)) {
            content += `\n# ${envDecl.description || manifest?.name || pluginId}\n${envDecl.key}=${envDecl.example || ""}\n`;
            changes.push(`Appended ${envDecl.key} to .env.example`);
          }
        }
      }

      if (changes.length > 0) {
        if (!dryRun) {
          await transaction.snapshotFile(".env.example");
          await fs.writeFile(envPath, content.trim() + "\n", "utf8");
        }
      }

      return { migrationId: "env-template-hygiene", name: "Plugin Environment Template Hygiene", applied: changes.length > 0, changes };
    },
  },
];

export interface ProjectMigrationResult {
  appliedCount: number;
  results: MigrationStepResult[];
  dryRun: boolean;
}

/**
 * Runs all applicable project migrations against a project in an atomic transaction.
 */
export async function runProjectMigrations(
  targetDir: string,
  options: { dryRun?: boolean; migrationIds?: string[] } = {},
): Promise<ProjectMigrationResult> {
  const { dryRun = false, migrationIds } = options;
  const config = await readProjectConfig(targetDir, { autoReconstruct: true });
  if (!config) {
    throw new Error(`Unable to read or reconstruct project configuration at "${targetDir}".`);
  }
  const pkg = await readProjectPackage(targetDir);

  const activeMigrations = migrationIds
    ? PROJECT_MIGRATIONS.filter((m) => migrationIds.includes(m.id))
    : PROJECT_MIGRATIONS;

  const results: MigrationStepResult[] = [];
  const transaction = new ProjectTransaction(targetDir);
  if (!dryRun) {
    transaction.begin();
  }

  try {
    for (const migration of activeMigrations) {
      const isApplicable = await migration.detect(targetDir, config, pkg);
      if (isApplicable) {
        const stepResult = await migration.apply(targetDir, config, pkg, transaction, dryRun);
        results.push(stepResult);
      }
    }

    if (!dryRun) {
      transaction.commit();
    }

    return {
      appliedCount: results.filter((r) => r.applied).length,
      results,
      dryRun,
    };
  } catch (error) {
    if (!dryRun) {
      await transaction.rollback();
    }
    throw error;
  }
}
