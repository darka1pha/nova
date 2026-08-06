import fs from "fs-extra";
import path from "node:path";

import type { PackageManager } from "@nova/core";

import { ADDON_FOLDERS, resolveFeatureKey } from "./addonRegistry.js";
import { ADDONS_DIR } from "./generator/index.js";
import { mergePackageAdditions, readPackageJson, writePackageJson } from "./packageMerge.js";
import { appendPluginEnvContributions } from "./plugin/applyEnv.js";
import { writePluginDocs } from "./plugin/applyDocs.js";
import { applyPluginPatches } from "./plugin/applyPatches.js";
import { applyPluginTemplates } from "./plugin/applyTemplates.js";
import { resolveDependencyGraph } from "./plugin/dependencyGraph.js";
import { getPluginRegistry } from "./plugin/legacyAdapter.js";
import { runPluginPrompts } from "./plugin/prompts.js";
import { runPluginHook } from "./plugin/runHooks.js";
import type { PluginResolutionContext } from "./plugin/types.js";
import { validatePlugins } from "./plugin/validate.js";
import { initializeProjectConfig } from "./project.js";
import { copyAddonWithRemap, hasSrcDirectory } from "./projectStructure.js";
import type { FeatureKey, UiLibrary } from "./types.js";

export interface AddFeatureOutcome {
  feature: FeatureKey;
  filesWritten: string[];
  filesSkipped: string[];
  addedDependencies: string[];
  addedDevDependencies: string[];
  addedScripts: string[];
  skippedScripts: string[];
  /** Extra template source dirs applied via this feature's plugin manifest,
   * on top of the legacy ADDON_FOLDERS overlay copy. Empty for every
   * plugin today, since none currently declare `templates`. */
  appliedTemplates: string[];
  /** Files rewritten by this feature's plugin-declared patches (e.g. middleware.ts). */
  patchedFiles: string[];
  /** .env.example keys appended by this feature's plugin-declared env contributions. */
  addedEnvKeys: string[];
  /** .env.example keys this feature declared that were already present and left untouched. */
  skippedEnvKeys: string[];
  /** Doc paths written by this feature's plugin-declared docs contributions. */
  writtenDocs: string[];
  /** Doc paths this feature would have written but already existed on disk. */
  skippedDocs: string[];
}

export interface AddFeaturesResult {
  targetDir: string;
  usesSrcDir: boolean;
  outcomes: AddFeatureOutcome[];
  unknownFeatures: string[];
  /**
   * Human-readable problems found for the requested selection - dependency
   * graph issues (missing requirements, conflicts, requires-cycles) as well
   * as any enabled plugin's own `validate(ctx)` self-check failures. Empty
   * when the selection is valid. If any blocking issue is present,
   * `outcomes` is empty and nothing was written to disk.
   */
  dependencyIssues: string[];
}

export interface AddFeaturesOptions {
  /** Overwrite files that already exist in the target project. Default: false. */
  force?: boolean;
  onStep?: (step: string) => void;
  /**
   * Skip running any selected plugin's own follow-up prompts (e.g. Prisma's
   * database provider, Docker Compose's "include Postgres?" confirm).
   * Defaults to `Boolean(process.env.CI)`, matching the non-interactive
   * behavior `collectAnswers()` already uses for full generation.
   */
  skipPrompts?: boolean;
}

async function detectPackageManager(targetDir: string): Promise<PackageManager> {
  if (await fs.pathExists(path.join(targetDir, "pnpm-lock.yaml"))) return "pnpm";
  if (await fs.pathExists(path.join(targetDir, "yarn.lock"))) return "yarn";
  if (await fs.pathExists(path.join(targetDir, "bun.lockb"))) return "bun";
  return "npm";
}

/**
 * Best-effort UI library detection from an existing project's already
 * installed dependencies, since `nova add` (unlike full generation) has no
 * explicit "which UI library" answer to read. Only used to populate
 * `PluginResolutionContext.uiLibrary` for plugin patches/docs/templates/
 * validate()/hooks that might branch on it - falls back to "shadcn" (the
 * default/no-op case) when nothing matches, which is always a safe default
 * since none of today's plugin contributions currently branch on UI library.
 */
const UI_LIBRARY_DEP_MARKERS: Record<string, UiLibrary> = {
  "@mui/material": "mui",
  "@chakra-ui/react": "chakra",
  antd: "ant",
  "@mantine/core": "mantine",
  "@nextui-org/react": "hero",
  daisyui: "daisy",
  "@headlessui/react": "headless",
};

function detectUiLibrary(pkg: Record<string, unknown>): UiLibrary {
  const deps: Record<string, string> = {
    ...((pkg.dependencies as Record<string, string> | undefined) ?? {}),
    ...((pkg.devDependencies as Record<string, string> | undefined) ?? {}),
  };

  for (const [dep, uiLibrary] of Object.entries(UI_LIBRARY_DEP_MARKERS)) {
    if (deps[dep]) return uiLibrary;
  }

  return "shadcn";
}

interface RenderResult {
  filesWritten: string[];
  filesSkipped: string[];
  appliedTemplates: string[];
}

interface PatchResult {
  patchedFiles: string[];
}

/**
 * Adds one or more existing Nova addon features to a project that already
 * exists on disk (as opposed to `generateProject`, which scaffolds a brand
 * new project). Works whether the target project keeps its code under
 * `src/` or at the project root - addon files are remapped accordingly, and
 * package.json dependencies/scripts are merged in rather than overwritten.
 *
 * This runs through the same plugin engine full generation uses:
 * `getPluginRegistry()`, `resolveDependencyGraph()`, `validatePlugins()`,
 * `applyPluginTemplates()`, `applyPluginPatches()`,
 * `appendPluginEnvContributions()`, `writePluginDocs()`, and
 * `runPluginHook()` for every applicable lifecycle stage - so a feature
 * added incrementally gets the same config patches (e.g. Security Headers'
 * middleware wrap), plugin-declared template overlays, `.env.example`
 * additions, plugin-authored docs, self-validation, and lifecycle hooks
 * that full generation already applies.
 *
 * Work proceeds in three phases across all requested features (render,
 * then patch, then package/env/docs) rather than one feature fully
 * end-to-end before the next, so `beforeRender`/`afterRender` and
 * `beforePatch`/`afterPatch` hooks bracket the same logical stage full
 * generation uses them for, regardless of how many features are being
 * added at once.
 */
export async function addFeaturesToProject(
  targetDirInput: string,
  requestedFeatures: string[],
  options: AddFeaturesOptions = {},
): Promise<AddFeaturesResult> {
  const targetDir = path.resolve(targetDirInput);
  const { force = false, onStep, skipPrompts = Boolean(process.env.CI) } = options;

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

  const registry = getPluginRegistry();

  // Validate the selection (requires/conflicts/requires-cycles) against the
  // plugin engine's dependency graph before writing anything - mirroring
  // the up-front validation `generateProject` performs via
  // `validatePluginSelection`, but expressed generically over
  // `PluginManifest`s so `nova add` gets the same guarantee without
  // duplicating that logic.
  const dependencyGraph = resolveDependencyGraph(resolvedFeatures, registry);
  const dependencyIssues = dependencyGraph.issues.map((issue) => issue.message);

  const hasBlockingIssue = dependencyGraph.issues.some(
    (issue) => issue.type === "conflict" || issue.type === "missing-requirement",
  );

  if (hasBlockingIssue) {
    return {
      targetDir,
      usesSrcDir,
      outcomes: [],
      unknownFeatures,
      dependencyIssues,
    };
  }

  // Topological order so a plugin's requirement is always applied (files
  // copied, package.json merged, patched) before the plugin that depends
  // on it. Safe to cast back to FeatureKey[]: every id in the order came
  // from `resolvedFeatures`, which is already FeatureKey[].
  const orderedFeatures = dependencyGraph.order as FeatureKey[];

  if (orderedFeatures.length === 0) {
    return { targetDir, usesSrcDir, outcomes: [], unknownFeatures, dependencyIssues };
  }

  const packageManager = await detectPackageManager(targetDir);
  const uiLibrary = detectUiLibrary(pkg);

  onStep?.("Resolving plugin prompts");
  const pluginAnswers = skipPrompts ? {} : await runPluginPrompts(orderedFeatures, registry);

  const pluginContext: PluginResolutionContext = {
    projectName: typeof pkg.name === "string" ? pkg.name : path.basename(targetDir),
    packageManager,
    uiLibrary,
    enabledPlugins: orderedFeatures,
    answers: pluginAnswers,
  };

  // Plugin self-validation (see `PluginManifest.validate`), same guarantee
  // full generation gives via `validatePlugins()` in
  // `src/generator/index.ts`. Runs before any file is written.
  onStep?.("Validating plugin selection");
  const validationIssues = validatePlugins(orderedFeatures, registry, pluginContext);
  if (validationIssues.length > 0) {
    return {
      targetDir,
      usesSrcDir,
      outcomes: [],
      unknownFeatures,
      dependencyIssues: [
        ...dependencyIssues,
        ...validationIssues.flatMap((issue) =>
          issue.errors.map((error) => `${issue.plugin}: ${error}`),
        ),
      ],
    };
  }

  await runPluginHook("beforeGenerate", orderedFeatures, registry, pluginContext);

  // Phase 1 - render: copy each feature's addon files, then apply any
  // plugin-declared `templates` contributions on top.
  await runPluginHook("beforeRender", orderedFeatures, registry, pluginContext);

  const renderResults = new Map<FeatureKey, RenderResult>();

  for (const feature of orderedFeatures) {
    onStep?.(`Copying files for ${feature}`);

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

    const templatesResult = await applyPluginTemplates(targetDir, [feature], registry, pluginContext);

    renderResults.set(feature, {
      filesWritten,
      filesSkipped,
      appliedTemplates: templatesResult.appliedTemplates,
    });
  }

  await runPluginHook("afterRender", orderedFeatures, registry, pluginContext);

  // Phase 2 - patch: apply every feature's plugin-declared config patches.
  await runPluginHook("beforePatch", orderedFeatures, registry, pluginContext);

  const patchResults = new Map<FeatureKey, PatchResult>();

  for (const feature of orderedFeatures) {
    onStep?.(`Applying patches for ${feature}`);
    const patchResult = await applyPluginPatches(targetDir, [feature], registry, pluginContext);
    patchResults.set(feature, { patchedFiles: patchResult.patchedFiles });
  }

  await runPluginHook("afterPatch", orderedFeatures, registry, pluginContext);

  // Phase 3 - complete: merge package.json contributions, env vars, docs.
  await runPluginHook("beforeComplete", orderedFeatures, registry, pluginContext);

  const outcomes: AddFeatureOutcome[] = [];

  for (const feature of orderedFeatures) {
    onStep?.(`Merging package.json for ${feature}`);
    const plugin = registry.getPlugin(feature);
    const mergeResult = mergePackageAdditions(pkg, {
      dependencies: plugin?.dependencies,
      devDependencies: plugin?.devDependencies,
      scripts: plugin?.scripts,
    });

    onStep?.(`Merging environment variables for ${feature}`);
    const envResult = await appendPluginEnvContributions(targetDir, [feature], registry);

    onStep?.(`Writing documentation for ${feature}`);
    const docsResult = await writePluginDocs(targetDir, [feature], registry, pluginContext);

    const render = renderResults.get(feature) ?? {
      filesWritten: [],
      filesSkipped: [],
      appliedTemplates: [],
    };
    const patch = patchResults.get(feature) ?? { patchedFiles: [] };

    outcomes.push({
      feature,
      filesWritten: render.filesWritten,
      filesSkipped: render.filesSkipped,
      addedDependencies: mergeResult.addedDependencies,
      addedDevDependencies: mergeResult.addedDevDependencies,
      addedScripts: mergeResult.addedScripts,
      skippedScripts: mergeResult.skippedScripts,
      appliedTemplates: render.appliedTemplates,
      patchedFiles: patch.patchedFiles,
      addedEnvKeys: envResult.addedKeys,
      skippedEnvKeys: envResult.skippedKeys,
      writtenDocs: docsResult.writtenDocs,
      skippedDocs: docsResult.skippedDocs,
    });
  }

  onStep?.("Writing package.json");
  await writePackageJson(targetDir, pkg);

  await runPluginHook("afterComplete", orderedFeatures, registry, pluginContext);
  await runPluginHook("afterGenerate", orderedFeatures, registry, pluginContext);

  await initializeProjectConfig(targetDir, orderedFeatures);

  return { targetDir, usesSrcDir, outcomes, unknownFeatures, dependencyIssues };
}
