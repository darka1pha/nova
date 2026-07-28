import fs from "fs-extra";
import path from "node:path";

/**
 * Copies every file from `srcDir` into `destDir`, creating directories as
 * needed. Used both for the base template and for each selected addon
 * overlay, so addons can simply "win" by copying after the base.
 */
export async function copyTemplateDir(srcDir: string, destDir: string) {
  await fs.ensureDir(destDir);
  await fs.copy(srcDir, destDir, { overwrite: true, errorOnExist: false });
}

export async function pathExists(filePath: string) {
  return fs.pathExists(filePath);
}

export function joinAddon(addonsRoot: string, name: string) {
  return path.join(addonsRoot, name);
}
