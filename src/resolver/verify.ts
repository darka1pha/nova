/**
 * Post-installation verification — checks that installed packages
 * match the resolved versions and constraints.
 */

import fs from "fs-extra";
import path from "node:path";
import semver from "semver";

import type { ResolvedPackage } from "./types.js";

export interface VerificationResult {
  ok: boolean;
  verified: Array<{ name: string; installed: string; expected: string }>;
  mismatches: Array<{ name: string; installed?: string; expected: string; reason: string }>;
  missing: string[];
}

/**
 * Verifies that installed packages in node_modules match the resolved
 * versions. Reads package.json from node_modules/<name>/package.json
 * to get the actual installed version.
 */
export async function verifyInstallation(
  targetDir: string,
  resolved: ResolvedPackage[],
): Promise<VerificationResult> {
  const verified: VerificationResult["verified"] = [];
  const mismatches: VerificationResult["mismatches"] = [];
  const missing: string[] = [];

  for (const pkg of resolved) {
    const pkgJsonPath = path.join(targetDir, "node_modules", pkg.name, "package.json");

    if (!(await fs.pathExists(pkgJsonPath))) {
      missing.push(pkg.name);
      continue;
    }

    try {
      const installed = (await fs.readJson(pkgJsonPath)) as { version?: string };
      const installedVersion = installed.version;

      if (!installedVersion) {
        mismatches.push({
          name: pkg.name,
          expected: pkg.versionRange,
          reason: "No version field in installed package.json",
        });
        continue;
      }

      // Check if the installed version satisfies the resolved range
      if (pkg.strategy === "exact") {
        if (installedVersion === pkg.version) {
          verified.push({ name: pkg.name, installed: installedVersion, expected: pkg.version });
        } else {
          mismatches.push({
            name: pkg.name,
            installed: installedVersion,
            expected: pkg.version,
            reason: `Expected exact version ${pkg.version}, got ${installedVersion}`,
          });
        }
      } else {
        // For compatible/latest, check if installed version satisfies the range
        if (semver.satisfies(installedVersion, pkg.versionRange)) {
          verified.push({ name: pkg.name, installed: installedVersion, expected: pkg.versionRange });
        } else {
          mismatches.push({
            name: pkg.name,
            installed: installedVersion,
            expected: pkg.versionRange,
            reason: `Installed ${installedVersion} does not satisfy ${pkg.versionRange}`,
          });
        }
      }
    } catch {
      mismatches.push({
        name: pkg.name,
        expected: pkg.versionRange,
        reason: "Could not read installed package.json",
      });
    }
  }

  return {
    ok: mismatches.length === 0 && missing.length === 0,
    verified,
    mismatches,
    missing,
  };
}
