import fs from "fs-extra";
import path from "node:path";

/**
 * Detects whether an existing project keeps application code under `src/`
 * (the layout every Nova template uses) or at the repository root (the
 * layout create-next-app produces when the "Use src/ directory?" prompt is
 * declined). "nova add" needs to know this because every addon template is
 * authored under templates/addons/**\/src/..., and those files need to land
 * in the right place either way.
 */
export async function hasSrcDirectory(targetDir: string): Promise<boolean> {
  return fs.pathExists(path.join(targetDir, "src"));
}

/**
 * Recursively lists every file inside `dir`, returning POSIX-style paths
 * (forward slashes) relative to `relativeTo`, regardless of host OS.
 */
export async function listFilesRecursive(
  dir: string,
  relativeTo: string = dir,
): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(absolute, relativeTo)));
    } else {
      files.push(path.relative(relativeTo, absolute).split(path.sep).join("/"));
    }
  }

  return files;
}

/**
 * Every addon template authors its application files under `src/...`. When
 * the target project has no `src/` directory, strip that leading segment so
 * files land at the project root instead, e.g.
 * `src/lib/redis/client.ts` -> `lib/redis/client.ts`.
 *
 * Files outside `src/` (docs, root-level configs like `cypress.config.ts`,
 * `prisma/schema.prisma`, `.husky/pre-commit`, `Dockerfile`, ...) are copied
 * unchanged in both layouts, since those never lived under `src/` to begin
 * with.
 */
export function remapAddonRelativePath(relPath: string, hasSrcDir: boolean): string {
  if (hasSrcDir) return relPath;
  if (relPath === "src" || relPath.startsWith("src/")) {
    return relPath.slice("src/".length);
  }
  return relPath;
}

export interface CopyAddonOptions {
  hasSrcDir: boolean;
  /** Overwrite files that already exist in the target project. Default: false. */
  force?: boolean;
}

export interface CopyAddonResult {
  /** Paths (relative to targetDir, POSIX-style) that were written. */
  written: string[];
  /** Paths that already existed and were left untouched (force was false). */
  skippedExisting: string[];
}

/**
 * Copies every file from an addon's template directory into an existing
 * project, remapping `src/...` paths away when the target has no `src/`
 * directory. Creates any intermediate folders that don't exist yet. Existing
 * files are preserved unless `force` is set, so re-running "nova add" (or
 * adding a second feature that happens to share a file) never silently
 * clobbers project-specific edits.
 */
export async function copyAddonWithRemap(
  addonDir: string,
  targetDir: string,
  options: CopyAddonOptions,
): Promise<CopyAddonResult> {
  const written: string[] = [];
  const skippedExisting: string[] = [];

  const relativeFiles = await listFilesRecursive(addonDir);

  for (const relFile of relativeFiles) {
    const destRel = remapAddonRelativePath(relFile, options.hasSrcDir);
    const srcAbsolute = path.join(addonDir, ...relFile.split("/"));
    const destAbsolute = path.join(targetDir, ...destRel.split("/"));

    const alreadyExists = await fs.pathExists(destAbsolute);
    if (alreadyExists && !options.force) {
      skippedExisting.push(destRel);
      continue;
    }

    await fs.ensureDir(path.dirname(destAbsolute));
    await fs.copy(srcAbsolute, destAbsolute, { overwrite: true });
    written.push(destRel);
  }

  return { written, skippedExisting };
}