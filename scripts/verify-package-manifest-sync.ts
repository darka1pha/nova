import pc from "picocolors";

import { verifyManifestSync } from "../src/generator/verifyManifestSync.js";

/**
 * CI/local regression guard: `src/packageManifest.ts` and `nova add` both
 * read from the single `FEATURE_CONTRIBUTIONS` map now (see
 * src/featureContributions.ts), so this should always pass by
 * construction. It stays in the pipeline to catch anyone who reintroduces
 * a hand-written, out-of-band dependency/script for a specific feature
 * directly in packageManifest.ts. Run via `npm run verify:manifest-sync`.
 */
function main() {
  const mismatches = verifyManifestSync();

  if (mismatches.length === 0) {
    console.log(pc.green("✓ packageManifest.ts and featureContributions.ts are in sync."));
    return;
  }

  console.error(
    pc.red(
      `✗ Found ${mismatches.length} feature(s) where buildPackageJson() diverges from FEATURE_CONTRIBUTIONS:\n`,
    ),
  );

  for (const { feature, mismatches: fieldMismatches } of mismatches) {
    console.error(pc.bold(pc.yellow(feature)));
    for (const mismatch of fieldMismatches) {
      const manifestSide =
        mismatch.fromManifest === undefined ? pc.dim("(absent)") : mismatch.fromManifest;
      const contributionSide =
        mismatch.fromContribution === undefined ? pc.dim("(absent)") : mismatch.fromContribution;

      console.error(
        `  ${mismatch.field}.${mismatch.key}: buildPackageJson()=${manifestSide} vs FEATURE_CONTRIBUTIONS=${contributionSide}`,
      );
    }
    console.error("");
  }

  console.error(
    pc.dim(
      "Fix: move any feature-specific dependency/script added directly in packageManifest.ts into src/featureContributions.ts instead.",
    ),
  );

  process.exitCode = 1;
}

main();