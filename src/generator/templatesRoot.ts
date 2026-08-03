import fs from "fs-extra";
import path from "node:path";

/**
 * Resolves the absolute path to the repo's `templates/` directory relative
 * to a compiled or source file's own directory.
 *
 * This has to tolerate two different directory depths depending on how the
 * caller is running:
 *  - In development (`tsx src/generator/index.ts` / `src/generator/context.ts`),
 *    the file lives at `src/generator/`, two levels below the repo root, so
 *    `templates/` is two levels up (`../../templates`).
 *  - In the published/CI build, tsup's named-entry output (see
 *    tsup.config.ts - both `src/index.ts` and `src/generator/index.ts` are
 *    named "index.ts", so entries are given explicit flat output names
 *    rather than mirroring the source directory structure) places the
 *    generator bundle directly at `dist/generator.js`. That file lives only
 *    one level below the repo root (`dist/`), so `templates/` is just one
 *    level up (`../templates`).
 *
 * Hard-coding either depth breaks the other environment (this is exactly
 * what caused `ENOENT ... lstat '.../templates/base'` in CI, where the
 * two-levels-up assumption walked past the repo root). Instead, this
 * checks which candidate actually exists on disk and falls back to the
 * dev-mode candidate if somehow neither is found (so the resulting error,
 * if any, still points at the "expected" dev-mode path).
 */
export function resolveTemplatesRoot(startDir: string): string {
  const candidates = [
    path.join(startDir, "..", "..", "templates"),
    path.join(startDir, "..", "templates"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}