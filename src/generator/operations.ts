import fs from "fs-extra";
import path from "node:path";

import { OperationExecutionError } from "./errors.js";
import type { Logger } from "./logger.js";

export type Operation =
  | { type: "mkdir"; path: string }
  | { type: "copyDir"; src: string; dest: string; label?: string }
  | { type: "writeFile"; path: string; content: string }
  | { type: "writeJson"; path: string; data: unknown };

export type OperationPlan = Operation[];

export interface ExecutePlanOptions {
  dryRun?: boolean;
  logger?: Logger;
}

export interface ExecutePlanResult {
  /** Absolute paths touched during execution, in execution order. */
  touchedPaths: string[];
}

/**
 * Executes an operation plan sequentially. Operations are simple,
 * inspectable data (rather than closures), so a plan can be logged,
 * dry-run, or (in the future) replayed/rolled back without re-deriving
 * what the generator "would" do.
 *
 * On failure, throws an `OperationExecutionError` wrapping the underlying
 * cause. The caller decides how to roll back (see `rollbackTargetDir`)
 * since only the caller knows whether a partial result is acceptable.
 */
export async function executePlan(
  plan: OperationPlan,
  options: ExecutePlanOptions = {},
): Promise<ExecutePlanResult> {
  const { dryRun = false, logger } = options;
  const touchedPaths: string[] = [];

  for (const operation of plan) {
    try {
      switch (operation.type) {
        case "mkdir":
          logger?.debug(`mkdir ${operation.path}`);
          if (!dryRun) {
            await fs.ensureDir(operation.path);
          }
          touchedPaths.push(operation.path);
          break;

        case "copyDir":
          logger?.debug(
            `copyDir${operation.label ? ` [${operation.label}]` : ""} ${operation.src} -> ${operation.dest}`,
          );
          if (!dryRun) {
            await fs.ensureDir(operation.dest);
            await fs.copy(operation.src, operation.dest, {
              overwrite: true,
              errorOnExist: false,
            });
          }
          touchedPaths.push(operation.dest);
          break;

        case "writeFile":
          logger?.debug(`writeFile ${operation.path}`);
          if (!dryRun) {
            await fs.ensureDir(path.dirname(operation.path));
            await fs.writeFile(operation.path, operation.content, "utf8");
          }
          touchedPaths.push(operation.path);
          break;

        case "writeJson":
          logger?.debug(`writeJson ${operation.path}`);
          if (!dryRun) {
            await fs.ensureDir(path.dirname(operation.path));
            await fs.writeJson(operation.path, operation.data, { spaces: 2 });
          }
          touchedPaths.push(operation.path);
          break;
      }
    } catch (error) {
      throw new OperationExecutionError(
        `Failed to execute operation "${operation.type}": ${error instanceof Error ? error.message : String(error)
        }`,
        error,
      );
    }
  }

  return { touchedPaths };
}

/**
 * Best-effort rollback for a fresh target directory: removes the whole
 * directory tree. Since `generateProject` only ever operates on a
 * directory it just created (or confirmed was empty), removing the root is
 * always safe and avoids leaving a half-generated project on disk.
 */
export async function rollbackTargetDir(targetDir: string, logger?: Logger): Promise<void> {
  logger?.warn(`Rolling back partially generated project at ${targetDir}`);
  await fs.remove(targetDir);
}