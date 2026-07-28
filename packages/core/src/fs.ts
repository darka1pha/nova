import fs from "fs-extra";
import path from "node:path";

/**
 * Copies every file from `srcDir` into `destDir`, creating directories as
 * needed. Used both for a plugin's base template and for each overlay
 * (addon/ui-library) applied on top of it, so overlays can simply "win" by
 * copying after the base — no merge logic required.
 */
export async function copyTemplateDir(srcDir: string, destDir: string) {
  await fs.ensureDir(destDir);
  await fs.copy(srcDir, destDir, { overwrite: true, errorOnExist: false });
}

export async function pathExists(filePath: string) {
  return fs.pathExists(filePath);
}

/**
 * Joins a plugin/addon root with a named subfolder. Kept as a tiny named
 * helper (rather than inlining `path.join`) so call sites read as intent
 * ("give me this addon's folder") instead of raw path arithmetic.
 */
export function joinAddon(addonsRoot: string, name: string) {
  return path.join(addonsRoot, name);
}
