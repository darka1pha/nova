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
 * IMPORTANT: this function used to fall back to a *guessed* path
 * (`../../templates`) when the walk-up search failed, and return that
 * guess even if it didn't exist on disk. That produced exactly the kind of
 * confusing failure we hit in CI: a downstream `ENOENT` on some
 * plausible-looking-but-wrong path, with zero information about what was
 * actually searched. This version instead throws immediately, listing
 * every directory it checked, so a failure here is self-diagnosing instead
 * of surfacing three call frames later as an opaque `lstat` error.
 */
export function resolveTemplatesRoot(startDir: string): string {
  const MAX_LEVELS = 10;
  const checked: string[] = [];

  let dir = startDir;
  for (let i = 0; i < MAX_LEVELS; i++) {
    const candidate = path.join(dir, "templates");
    checked.push(path.join(candidate, "base"));

    if (fs.existsSync(path.join(candidate, "base"))) {
      return candidate;
    }

    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }

  throw new Error(
    `Could not locate the "templates/base" directory starting from "${startDir}".\n` +
    `Checked the following candidates, none of which exist:\n` +
    checked.map((c) => `  - ${c}`).join("\n") +
    `\n\nThis usually means either:\n` +
    `  1. "dist/" is stale and needs a fresh "npm run build" after a template/source change, or\n` +
    `  2. the "templates/" directory is missing from this checkout (verify it wasn't excluded ` +
    `by a shallow/sparse checkout, and that it's present in the commit being tested).`,
  );
}