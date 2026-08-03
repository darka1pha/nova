import fs from "fs-extra";
import path from "node:path";

import { ADDON_FOLDERS, resolveFeatureKey } from "./addonRegistry.js";
import { FEATURE_PACKAGE_ADDITIONS } from "./featurePackageAdditions.js";
import { ADDONS_DIR } from "./generator/index.js";
import { mergePackageAdditions, readPackageJson, writePackageJson } from "./packageMerge.js";
import { copyAddonWithRemap, hasSrcDirectory } from "./projectStructure.js";
import type { FeatureKey } from "./types.js";

export interface AddFeatureOutcome {
  feature: FeatureKey;
  filesWritten: string[];
  filesSkipped: string[];
  addedDependencies: string[];
  addedDevDependencies: string[];
  addedScripts: string[];
  skippedScripts: string[];
}

export interface AddFeaturesResult {
  targetDir: string;
  usesSrcDir: boolean;
  outcomes: AddFeatureOutcome[];
  unknownFeatures: string[];
}

export interface AddFeaturesOptions {
  /** Overwrite files that already exist in the target project. Default: false. */
  force?: boolean;
  onStep?: (step: string) => void;
}

/**
 * Adds one or more existing Nova addon features to a project that already
 * exists on disk (as opposed to `generateProject`, which scaffolds a brand
 * new project). Works whether the target project keeps its code under
 * `src/` or at the project root - addon files are remapped accordingly, and
 * package.json dependencies/scripts are merged in rather than overwritten.
 */
export async function addFeaturesToProject(
  targetDirInput: string,
  requestedFeatures: string[],
  options: AddFeaturesOptions = {},
): Promise<AddFeaturesResult> {
  const targetDir = path.resolve(targetDirInput);
  const { force = false, onStep } = options;

  const pkg = await readPackageJson(targetDir);
  const usesSrcDir = await hasSrcDirectory(targetDir);

  const unknownFeatures: string[] = [];
  const resolvedFeatures: FeatureKey[] = [];

  for (const raw of requestedFeatures) {
    const resolved = resolveFeatureKey(raw);
    if (!resolved) {
      unknownFeatures.push(raw);
      continue;
    }
    if (!resolvedFeatures.includes(resolved)) {
      resolvedFeatures.push(resolved);
    }
  }

  const outcomes: AddFeatureOutcome[] = [];

  for (const feature of resolvedFeatures) {
    onStep?.(`Adding ${feature}`);

    const addonFolder = ADDON_FOLDERS[feature];
    const addonDir = path.join(ADDONS_DIR, addonFolder);

    let filesWritten: string[] = [];
    let filesSkipped: string[] = [];

    if (await fs.pathExists(addonDir)) {
      const copyResult = await copyAddonWithRemap(addonDir, targetDir, {
        hasSrcDir: usesSrcDir,
        force,
      });
      filesWritten = copyResult.written;
      filesSkipped = copyResult.skippedExisting;
    }

    const additions = FEATURE_PACKAGE_ADDITIONS[feature] ?? {};
    const mergeResult = mergePackageAdditions(pkg, additions);

    outcomes.push({
      feature,
      filesWritten,
      filesSkipped,
      addedDependencies: mergeResult.addedDependencies,
      addedDevDependencies: mergeResult.addedDevDependencies,
      addedScripts: mergeResult.addedScripts,
      skippedScripts: mergeResult.skippedScripts,
    });
  }

  if (resolvedFeatures.length > 0) {
    onStep?.("Writing package.json");
    await writePackageJson(targetDir, pkg);
  }

  return { targetDir, usesSrcDir, outcomes, unknownFeatures };
}