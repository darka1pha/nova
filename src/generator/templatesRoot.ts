import fs from "fs-extra";
import path from "node:path";

/**
 * Resolves the absolute path to the repo's `templates/` directory relative
 * to a compiled or source file's own directory.
 *
 * This walks upward from `startDir`, checking each ancestor directory for a
 * `templates/base` folder, and returns the first `templates` directory
 * found. This avoids hard-coding an exact number of directory levels
 * between the calling file and the repo root, which is fragile because
 * that depth differs between:
 *  - development (`tsx src/generator/index.ts` / `src/generator/context.ts`),
 *    where the file lives at `src/generator/`, two levels below the repo
 *    root, so `templates/` is two levels up (`../../templates`).
 *  - the published/CI build, where tsup's named-entry output (see
 *    tsup.config.ts) places the generator bundle directly at
 *    `dist/generator.js`, one level below the repo root, so `templates/`
 *    is just one level up (`../templates`).
 *  - any other build/packaging layout that might be introduced later.
 *
 * Hard-coding either depth breaks the other environment (this is exactly
 * what caused `ENOENT ... lstat '.../templates/base'` in CI, where the
 * two-levels-up assumption walked past the repo root). Walking upward and
 * checking for the actual folder on disk is layout-agnostic and self-
 * correcting.
 *
 * If no ancestor contains a `templates/base` folder (e.g. templates truly
 * don't exist), this falls back to the historical two fixed-depth
 * candidates so that any resulting "template not found" error still points
 * at a sensible, previously-expected path rather than an arbitrary one.
 */
export function resolveTemplatesRoot(startDir: string): string {
  const MAX_LEVELS = 8;

  let dir = startDir;
  for (let i = 0; i < MAX_LEVELS; i++) {
    const candidate = path.join(dir, "templates");
    if (fs.existsSync(path.join(candidate, "base"))) {
      return candidate;
    }

    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }

  const fallbackCandidates = [
    path.join(startDir, "..", "..", "templates"),
    path.join(startDir, "..", "templates"),
  ];

  for (const candidate of fallbackCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return fallbackCandidates[0];
}