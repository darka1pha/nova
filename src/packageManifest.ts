import { FEATURE_CONTRIBUTIONS } from "./featureContributions.js";
import type { Answers, FeatureKey } from "./types.js";

/**
 * Builds the generated project's package.json.
 * Kept as pure data so it's easy to bump versions in one place.
 *
 * Per-feature dependencies/devDependencies/scripts come from
 * `FEATURE_CONTRIBUTIONS` (src/featureContributions.ts) - the same map
 * `nova add` uses via `featurePackageAdditions.ts` - so full generation and
 * incremental `nova add` can never disagree about what a feature
 * contributes. Only base (always-present) dependencies and UI-library
 * dependencies are declared inline here, since those aren't feature flags.
 */
export function buildPackageJson({ projectName, features, uiLibrary = "shadcn" }: Pick<Answers, "projectName" | "features"> & Partial<Pick<Answers, "uiLibrary">>) {
  const scripts: Record<string, string> = {
    dev: "next dev --turbopack",
    build: "next build",
    start: "next start",
    lint: "eslint .",
    "lint:fix": "eslint . --fix",
    format: "prettier --write .",
    typecheck: "tsc --noEmit",
  };

  const dependencies: Record<string, string> = {
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

  const devDependencies: Record<string, string> = {
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

  if (uiLibrary === "mui") {
    dependencies["@emotion/react"] = "^11.14.0";
    dependencies["@emotion/styled"] = "^11.14.1";
    dependencies["@mui/icons-material"] = "^9.2.0";
    dependencies["@mui/material"] = "^9.2.0";
    dependencies["@mui/material-nextjs"] = "^9.1.1";
  }

  if (uiLibrary === "chakra") {
    dependencies["@chakra-ui/react"] = "^3.36.1";
    dependencies["@emotion/react"] = "^11.14.0";
  }

  if (uiLibrary === "ant") {
    dependencies["antd"] = "^5.10.0";
  }

  if (uiLibrary === "mantine") {
    dependencies["@mantine/core"] = "^6.0.0";
    dependencies["@mantine/hooks"] = "^6.0.0";
  }

  if (uiLibrary === "hero") {
    dependencies["@nextui-org/react"] = "^1.0.0";
  }

  if (uiLibrary === "daisy") {
    devDependencies["daisyui"] = "^3.1.0";
  }

  if (uiLibrary === "headless") {
    dependencies["@headlessui/react"] = "^1.8.0";
    dependencies["@heroicons/react"] = "^2.0.18";
  }

  for (const [feature, enabled] of Object.entries(features) as [FeatureKey, boolean][]) {
    if (!enabled) continue;

    const contribution = FEATURE_CONTRIBUTIONS[feature];
    if (!contribution) continue;

    Object.assign(dependencies, contribution.dependencies ?? {});
    Object.assign(devDependencies, contribution.devDependencies ?? {});
    Object.assign(scripts, contribution.scripts ?? {});
  }

  return {
    name: projectName,
    version: "0.1.6",
    private: true,
    scripts,
    dependencies: sortKeys(dependencies),
    devDependencies: sortKeys(devDependencies),
  };
}

function sortKeys<T extends Record<string, string>>(obj: T) {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b))) as T;
}