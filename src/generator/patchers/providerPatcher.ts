import fs from "fs-extra";
import path from "node:path";

import type { FeatureFlags, UiLibrary } from "../../types.js";
import type { PatchContext, ProviderContribution } from "./types.js";

/**
 * Providers that may wrap `<AppProviders>`'s children, in the order they
 * should be nested (outermost first). New providers (from a future UI
 * library or plugin) register here instead of editing `generator.ts`.
 */
const PROVIDER_CONTRIBUTIONS: ProviderContribution[] = [
  {
    active: (ctx) => ctx.uiLibrary === "mui",
    importLine: 'import { MuiProvider } from "@/providers/mui-provider";',
    open: "<MuiProvider>",
    close: "</MuiProvider>",
  },
  {
    active: (ctx) => ctx.uiLibrary === "chakra",
    importLine: 'import { ChakraAppProvider } from "@/providers/chakra-provider";',
    open: "<ChakraAppProvider>",
    close: "</ChakraAppProvider>",
  },
  {
    active: (ctx) => ctx.features.tanstackQuery,
    importLine: 'import { QueryProvider } from "@/providers/query-provider";',
    open: "<QueryProvider>",
    close: "</QueryProvider>",
  },
];

export async function patchAppProviders(
  targetDir: string,
  features: FeatureFlags,
  uiLibrary: UiLibrary,
): Promise<void> {
  const ctx: PatchContext = { features, uiLibrary };
  const active = PROVIDER_CONTRIBUTIONS.filter((contribution) => contribution.active(ctx));

  if (!active.length) return;

  const providersPath = path.join(targetDir, "src", "providers", "app-providers.tsx");
  let content = await fs.readFile(providersPath, "utf8");

  const imports = active.map((contribution) => contribution.importLine).join("\n");

  content = content.replace(
    'import { ThemeProvider } from "@/components/providers/theme-provider";',
    `import { ThemeProvider } from "@/components/providers/theme-provider";\n${imports}`,
  );

  content = content.replace(
    "<ThemeProvider disableTransitionOnChange>\n      {children}\n    </ThemeProvider>",
    `<ThemeProvider disableTransitionOnChange>\n${renderProviderTree(active, 3)}\n    </ThemeProvider>`,
  );

  await fs.writeFile(providersPath, content, "utf8");
}

function renderProviderTree(contributions: ProviderContribution[], depth: number): string {
  const indent = "  ".repeat(depth);

  if (!contributions.length) {
    return `${indent}{children}`;
  }

  const [contribution, ...rest] = contributions;
  return [
    `${indent}${contribution.open}`,
    renderProviderTree(rest, depth + 1),
    `${indent}${contribution.close}`,
  ].join("\n");
}