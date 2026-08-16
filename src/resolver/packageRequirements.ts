/**
 * Converts Nova's existing static package declarations (FEATURE_CONTRIBUTIONS
 * and buildPackageJson's inline base deps) into the PackageRequirement model
 * used by the centralized resolver.
 *
 * This is the bridge between the existing single source of truth and the new
 * resolution system — FEATURE_CONTRIBUTIONS remains authoritative for what
 * each feature contributes. This module only reformats those declarations
 * as resolver inputs.
 */

import { FEATURE_CONTRIBUTIONS } from "../featureContributions.js";
import type { Answers, FeatureKey, UiLibrary } from "../types.js";
import type { PackageRequirement, PackageResolutionStrategy } from "./types.js";

/**
 * Converts a version string from FEATURE_CONTRIBUTIONS (e.g. "^0.36.4")
 * into a PackageRequirement with the appropriate strategy.
 *
 * - Defaults to "latest" so project creation and additions install the latest
 *   stable releases published on npm (e.g. Next.js 16.3.1, React 19, etc.).
 * - "compatible" resolves the newest version satisfying the declared range.
 * - "exact" validates that the exact version exists.
 */
function versionToRequirement(
  name: string,
  versionSpec: string,
  dev: boolean,
  defaultStrategy: PackageResolutionStrategy = "latest",
): PackageRequirement {
  const trimmed = versionSpec.trim();

  if (trimmed === "latest" || trimmed === "*") {
    return { name, strategy: "latest", dev };
  }

  // Exact versions ("1.2.3") without range prefixes
  if (/^\d+\.\d+\.\d+/.test(trimmed) && !/^[\^~><=]|\|\|/.test(trimmed)) {
    return { name, strategy: "exact", version: trimmed, dev };
  }

  const range = /^[\^~><=]|\|\|/.test(trimmed) ? trimmed : `^${trimmed}`;

  return {
    name,
    strategy: defaultStrategy,
    range,
    dev,
  };
}

/**
 * Returns base project dependencies as PackageRequirements.
 * These are the always-present deps from buildPackageJson() in packageManifest.ts.
 */
export function collectBaseRequirements(
  uiLibrary: UiLibrary = "shadcn",
  strategy: PackageResolutionStrategy = "latest",
): PackageRequirement[] {
  const requirements: PackageRequirement[] = [];

  // Base dependencies (always present)
  const baseDeps: Record<string, string> = {
    next: "^15.1.0",
    react: "^19.0.0",
    "react-dom": "^19.0.0",
    "next-intl": "^4.13.0",
    "react-hook-form": "^7.54.0",
    zod: "^3.24.1",
    "@hookform/resolvers": "^3.9.1",
    clsx: "^2.1.1",
    "tailwind-merge": "^2.5.5",
    "class-variance-authority": "^0.7.1",
    "lucide-react": "^0.468.0",
    "@radix-ui/react-slot": "^1.1.1",
    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-dropdown-menu": "^2.1.4",
    "@radix-ui/react-label": "^2.1.1",
    "@radix-ui/react-toast": "^1.2.4",
    "next-themes": "^0.4.4",
  };

  for (const [name, version] of Object.entries(baseDeps)) {
    requirements.push(versionToRequirement(name, version, false, strategy));
  }

  // Base devDependencies (always present)
  const baseDevDeps: Record<string, string> = {
    typescript: "^5.7.2",
    "@types/node": "^22.10.2",
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    eslint: "^9.17.0",
    "@eslint/js": "^9.17.0",
    "@next/eslint-plugin-next": "^15.1.0",
    "eslint-config-next": "^15.1.0",
    globals: "^15.14.0",
    "@typescript-eslint/eslint-plugin": "^8.18.2",
    "@typescript-eslint/parser": "^8.18.2",
    "eslint-plugin-simple-import-sort": "^12.1.1",
    prettier: "^3.4.2",
    "prettier-plugin-tailwindcss": "^0.6.9",
    tailwindcss: "^3.4.17",
    postcss: "^8.4.49",
    autoprefixer: "^10.4.20",
  };

  for (const [name, version] of Object.entries(baseDevDeps)) {
    requirements.push(versionToRequirement(name, version, true, strategy));
  }

  // UI library dependencies
  const uiDeps: Partial<Record<UiLibrary, Record<string, string>>> = {
    mui: {
      "@emotion/react": "^11.14.0",
      "@emotion/styled": "^11.14.1",
      "@mui/icons-material": "^9.2.0",
      "@mui/material": "^9.2.0",
      "@mui/material-nextjs": "^9.1.1",
    },
    chakra: {
      "@chakra-ui/react": "^3.36.1",
      "@emotion/react": "^11.14.0",
    },
    ant: { antd: "^5.10.0" },
    mantine: {
      "@mantine/core": "^6.0.0",
      "@mantine/hooks": "^6.0.0",
    },
    hero: { "@nextui-org/react": "^1.0.0" },
    daisy: { daisyui: "^3.1.0" },
    headless: {
      "@headlessui/react": "^1.8.0",
      "@heroicons/react": "^2.0.18",
    },
  };

  const uiLibDeps = uiDeps[uiLibrary];
  if (uiLibDeps) {
    const isDev = uiLibrary === "daisy"; // daisyui is a devDependency
    for (const [name, version] of Object.entries(uiLibDeps)) {
      requirements.push(versionToRequirement(name, version, isDev, strategy));
    }
  }

  return requirements;
}

/**
 * Converts FEATURE_CONTRIBUTIONS entries for the given features into
 * PackageRequirements.
 */
export function collectFeatureRequirements(
  features: FeatureKey[],
  strategy: PackageResolutionStrategy = "latest",
): PackageRequirement[] {
  const requirements: PackageRequirement[] = [];

  for (const feature of features) {
    const contribution = FEATURE_CONTRIBUTIONS[feature];
    if (!contribution) continue;

    for (const [name, version] of Object.entries(contribution.dependencies ?? {})) {
      requirements.push(versionToRequirement(name, version, false, strategy));
    }

    for (const [name, version] of Object.entries(contribution.devDependencies ?? {})) {
      requirements.push(versionToRequirement(name, version, true, strategy));
    }
  }

  return requirements;
}

/**
 * Collects all PackageRequirements for a full project generation:
 * base deps + UI lib deps + all enabled feature deps.
 */
export function collectAllRequirements(
  answers: Pick<Answers, "features"> & Partial<Pick<Answers, "uiLibrary">>,
  strategy: PackageResolutionStrategy = "latest",
): PackageRequirement[] {
  const enabledFeatures = (Object.entries(answers.features) as [FeatureKey, boolean][])
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);

  return [
    ...collectBaseRequirements(answers.uiLibrary, strategy),
    ...collectFeatureRequirements(enabledFeatures, strategy),
  ];
}

/**
 * Returns the set of base dependency names (production + dev) that should
 * never be removed by `nova remove`, since they belong to the base project
 * rather than any plugin.
 */
export function getBaseDependencyNames(uiLibrary: UiLibrary = "shadcn"): Set<string> {
  return new Set(collectBaseRequirements(uiLibrary).map((r) => r.name));
}
