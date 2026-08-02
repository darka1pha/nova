import { FEATURE_CONTRIBUTIONS } from "./featureContributions.js";
import type { PackageAdditions } from "./packageMerge.js";
import type { FeatureKey } from "./types.js";

/**
 * @deprecated Kept as a re-export for backward compatibility with any code
 * importing `FEATURE_PACKAGE_ADDITIONS` directly (e.g. `src/add.ts`). The
 * actual data now lives in `src/featureContributions.ts`, which is also
 * consumed by `src/packageManifest.ts` for full generation - see that
 * file's docstring for why the two were merged into one source of truth.
 */
export const FEATURE_PACKAGE_ADDITIONS: Record<FeatureKey, PackageAdditions> =
  FEATURE_CONTRIBUTIONS;