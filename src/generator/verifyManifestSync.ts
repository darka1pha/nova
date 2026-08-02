import { FEATURE_CONTRIBUTIONS } from "../featureContributions.js";
import { buildPackageJson } from "../packageManifest.js";
import type { FeatureFlags, FeatureKey } from "../types.js";

export interface ManifestFieldMismatch {
  /** e.g. "dependencies", "devDependencies", "scripts" */
  field: "dependencies" | "devDependencies" | "scripts";
  key: string;
  /** Value actually produced by buildPackageJson for this feature alone. */
  fromManifest?: string;
  /** Value declared for this feature in FEATURE_CONTRIBUTIONS. */
  fromContribution?: string;
}

export interface FeatureManifestMismatch {
  feature: FeatureKey;
  mismatches: ManifestFieldMismatch[];
}

const ALL_FEATURE_KEYS = Object.keys(FEATURE_CONTRIBUTIONS) as FeatureKey[];

function allFeaturesDisabled(): FeatureFlags {
  return Object.fromEntries(ALL_FEATURE_KEYS.map((key) => [key, false])) as FeatureFlags;
}

function diffRecord(
  field: ManifestFieldMismatch["field"],
  fromManifest: Record<string, string>,
  fromContribution: Record<string, string>,
): ManifestFieldMismatch[] {
  const keys = new Set([...Object.keys(fromManifest), ...Object.keys(fromContribution)]);
  const mismatches: ManifestFieldMismatch[] = [];

  for (const key of keys) {
    const manifestValue = fromManifest[key];
    const contributionValue = fromContribution[key];
    if (manifestValue !== contributionValue) {
      mismatches.push({ field, key, fromManifest: manifestValue, fromContribution: contributionValue });
    }
  }

  return mismatches;
}

function onlyChangedKeys(
  baseline: Record<string, string>,
  withFeature: Record<string, string>,
): Record<string, string> {
  const changed: Record<string, string> = {};
  for (const [key, value] of Object.entries(withFeature)) {
    if (baseline[key] !== value) {
      changed[key] = value;
    }
  }
  return changed;
}

/**
 * Since `buildPackageJson` (full generation) and `FEATURE_PACKAGE_ADDITIONS`
 * (`nova add`, re-exported from `nova add`'s import path) both now read
 * directly from `FEATURE_CONTRIBUTIONS`, this check is structurally
 * guaranteed to pass - drift is no longer possible by construction.
 *
 * It's kept as a regression guard rather than deleted: if a future change
 * to `buildPackageJson` adds a feature-specific dependency/script *outside*
 * the `FEATURE_CONTRIBUTIONS` loop (e.g. a one-off `if (features.x)` block
 * reintroduced by mistake), this test will catch the resulting divergence
 * immediately instead of it going unnoticed again.
 */
export function verifyManifestSync(): FeatureManifestMismatch[] {
  const baseline = buildPackageJson({
    projectName: "manifest-sync-check",
    features: allFeaturesDisabled(),
    uiLibrary: "shadcn",
  });

  const results: FeatureManifestMismatch[] = [];

  for (const feature of ALL_FEATURE_KEYS) {
    const withFeature = buildPackageJson({
      projectName: "manifest-sync-check",
      features: { ...allFeaturesDisabled(), [feature]: true },
      uiLibrary: "shadcn",
    });

    const manifestDeps = onlyChangedKeys(baseline.dependencies, withFeature.dependencies);
    const manifestDevDeps = onlyChangedKeys(baseline.devDependencies, withFeature.devDependencies);
    const manifestScripts = onlyChangedKeys(baseline.scripts, withFeature.scripts);

    const contribution = FEATURE_CONTRIBUTIONS[feature] ?? {};

    const mismatches = [
      ...diffRecord("dependencies", manifestDeps, contribution.dependencies ?? {}),
      ...diffRecord("devDependencies", manifestDevDeps, contribution.devDependencies ?? {}),
      ...diffRecord("scripts", manifestScripts, contribution.scripts ?? {}),
    ];

    if (mismatches.length > 0) {
      results.push({ feature, mismatches });
    }
  }

  return results;
}