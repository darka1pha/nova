import { devCommand, installCommand } from "@nova/core";
import fs from "fs-extra";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ADDON_FOLDERS } from "../addonRegistry.js";
import { appendPluginEnvContributions } from "../plugin/applyEnv.js";
import { writePluginDocs } from "../plugin/applyDocs.js";
import { applyPluginPatches } from "../plugin/applyPatches.js";
import { applyPluginTemplates } from "../plugin/applyTemplates.js";
import { getPluginRegistry } from "../plugin/legacyAdapter.js";
import { runPluginHook } from "../plugin/runHooks.js";
import type { PluginRegistry } from "../plugin/registry.js";
import type { PluginResolutionContext } from "../plugin/types.js";
import { validatePlugins } from "../plugin/validate.js";
import { buildGeneratorContext } from "./context.js";
import {
  DirectoryNotEmptyError,
  InvalidProjectNameError,
  PluginValidationError,
} from "./errors.js";
import { HookRegistry } from "./hooks.js";
import { executePlan, rollbackTargetDir, type OperationPlan } from "./operations.js";
import { patchAppProviders, patchMiddleware, patchNextConfig } from "./patchers/index.js";
import { resolveTemplatesRoot } from "./templatesRoot.js";
import { validatePluginSelection } from "./validators.js";
import { buildPackageJson, buildPackageJsonResolved } from "../packageManifest.js";
import { PackageResolver } from "../resolver/index.js";
import { isValidProjectName } from "../prompts.js";
import { initializeProjectConfig } from "../project.js";
import { generateMobileProject } from "./mobile.js";
export { generateMobileProject };

import type {
  Answers,
  FeatureFlags,
  FeatureKey,
  GenerateProjectOptions,
  UiLibrary,
} from "../types.js";


// This file lives at src/generator/index.ts in dev, but tsup's named
// entries build it to the flat dist/generator.js (see tsup.config.ts), so
// __dirname is one level shallower once built. resolveTemplatesRoot()
// checks both possible depths - see templatesRoot.ts for the full
// explanation of why a single hard-coded "../.." broke CI.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_ROOT = resolveTemplatesRoot(__dirname);
const BASE_DIR = path.join(TEMPLATES_ROOT, "base");
// Exported so src/add.ts can reuse the exact same addon templates when
// adding a feature to an already-existing project.
export const ADDONS_DIR = path.join(TEMPLATES_ROOT, "addons");
const UI_DIR = path.join(TEMPLATES_ROOT, "ui");

export interface GenerateProjectResult {
  targetDir: string;
  /**
   * The plugin registry used for this generation run. Returned so callers
   * (e.g. `src/index.ts`, when `installNow` is set) can invoke additional
   * plugin lifecycle hooks - `beforeInstall`/`afterInstall` - around steps
   * that happen outside `generateProject` itself, without having to
   * rebuild the registry or re-derive the enabled plugin list.
   */
  pluginRegistry: PluginRegistry;
  /** The resolution context every plugin contribution/hook was evaluated against. */
  pluginContext: PluginResolutionContext;
}

export async function generateProject(
  answers: Answers,
  { onStep, dryRun = false, verbose = false }: GenerateProjectOptions = {},
): Promise<GenerateProjectResult> {
  if (!isValidProjectName(answers.projectName)) {
    throw new InvalidProjectNameError(answers.projectName);
  }

  const context = buildGeneratorContext(answers, { onStep, dryRun, verbose });
  const { logger, uiLibrary } = context;
  const targetDir = context.paths.targetDir;
  const hooks = new HookRegistry();

  if (await fs.pathExists(targetDir)) {
    const files = await fs.readdir(targetDir);
    if (files.length > 0) {
      throw new DirectoryNotEmptyError(answers.projectName);
    }
  }

  // Validate the plugin selection before touching the filesystem at all -
  // see src/generator/pluginMetadata.ts for the declared constraints.
  validatePluginSelection(answers.features);

  // Build the plugin registry and resolution context up front (rather than
  // midway through generation, as in earlier versions of this function) so
  // both plugin self-validation and every lifecycle hook - including
  // "beforeGenerate", fired before a single file is written - can use them.
  const pluginRegistry = getPluginRegistry();
  const enabledPluginIds = (Object.entries(answers.features) as [FeatureKey, boolean][])
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);

  const pluginContext: PluginResolutionContext = {
    projectName: answers.projectName,
    packageManager: answers.packageManager,
    uiLibrary,
    enabledPlugins: enabledPluginIds,
    answers: answers.pluginAnswers ?? {},
  };

  // Plugin self-validation (Node version, OS, cross-field checks on the
  // plugin's own prompt answers, etc. - see `PluginManifest.validate`).
  // Runs before any file is written, same guarantee
  // `validatePluginSelection`/`resolveDependencyGraph` already give for
  // requires/conflicts.
  const validationIssues = validatePlugins(enabledPluginIds, pluginRegistry, pluginContext);
  if (validationIssues.length > 0) {
    throw new PluginValidationError(validationIssues);
  }

  // Resolve package versions from the registry. Falls back to static
  // versions from FEATURE_CONTRIBUTIONS when the registry is unreachable.
  const resolver = new PackageResolver();

  await hooks.run("beforeGenerate", context);
  await runPluginHook("beforeGenerate", enabledPluginIds, pluginRegistry, pluginContext);

  logger.step("Copying base template");

  const plan: OperationPlan = [
    { type: "mkdir", path: targetDir },
    { type: "copyDir", src: BASE_DIR, dest: targetDir, label: "base" },
  ];

  logger.step("Applying selected features");
  const enabledFeatures: FeatureKey[] = [];
  for (const [flag, folder] of Object.entries(ADDON_FOLDERS) as [FeatureKey, string][]) {
    if (!answers.features[flag]) continue;
    const addonDir = path.join(ADDONS_DIR, folder);
    if (await fs.pathExists(addonDir)) {
      enabledFeatures.push(flag);
      await hooks.run("beforePlugin", { feature: flag, context });
      plan.push({ type: "copyDir", src: addonDir, dest: targetDir, label: flag });
    }
  }

  if (uiLibrary !== "shadcn") {
    const uiDir = path.join(UI_DIR, uiLibrary);
    if (await fs.pathExists(uiDir)) {
      plan.push({ type: "copyDir", src: uiDir, dest: targetDir, label: `ui:${uiLibrary}` });
    }
  }

  try {
    await runPluginHook("beforeRender", enabledPluginIds, pluginRegistry, pluginContext);

    await executePlan(plan, { dryRun, logger });

    for (const feature of enabledFeatures) {
      await hooks.run("afterPlugin", { feature, context });
    }

    if (dryRun) {
      logger.info("Dry run complete - no files were written.");
      await runPluginHook("afterRender", enabledPluginIds, pluginRegistry, pluginContext);
      await hooks.run("afterGenerate", context);
      await runPluginHook("afterGenerate", enabledPluginIds, pluginRegistry, pluginContext);
      return { targetDir, pluginRegistry, pluginContext };
    }

    logger.step("Resolving package versions");
    let packageJson: ReturnType<typeof buildPackageJson>;
    try {
      packageJson = await buildPackageJsonResolved(answers, resolver);
      if (resolver.warnings.length > 0) {
        for (const warning of resolver.warnings) {
          logger.warn(warning);
        }
      }
    } catch {
      logger.warn("Package version resolution failed. Using static fallback versions.");
      packageJson = buildPackageJson(answers);
    }

    logger.step("Writing package.json");
    await fs.writeJson(path.join(targetDir, "package.json"), packageJson, { spaces: 2 });

    logger.step("Patching configuration");
    await patchNextConfig(targetDir, answers.features);
    await patchAppProviders(targetDir, answers.features, uiLibrary);
    await patchMiddleware(targetDir, answers.features);

    // Everything below this point drives off the Phase 2 plugin registry
    // rather than generator-owned, per-feature arrays: templates, patches,
    // env vars, and docs a plugin declares on its own manifest (see
    // src/plugin/). Plugins that haven't migrated a given contribution
    // (most, for now) simply have an empty/undefined array here and these
    // calls are no-ops for them.
    logger.step("Applying plugin-declared templates");
    await applyPluginTemplates(targetDir, enabledPluginIds, pluginRegistry, pluginContext);

    await runPluginHook("afterRender", enabledPluginIds, pluginRegistry, pluginContext);

    logger.step("Applying plugin-declared patches");
    await runPluginHook("beforePatch", enabledPluginIds, pluginRegistry, pluginContext);
    await applyPluginPatches(targetDir, enabledPluginIds, pluginRegistry, pluginContext);
    await runPluginHook("afterPatch", enabledPluginIds, pluginRegistry, pluginContext);

    logger.step("Merging plugin-declared environment variables");
    await appendPluginEnvContributions(targetDir, enabledPluginIds, pluginRegistry);

    logger.step("Writing plugin-declared documentation");
    await writePluginDocs(targetDir, enabledPluginIds, pluginRegistry, pluginContext);

    if (answers.features.storybook) {
      logger.step("Patching Storybook preview");
      await writeStorybookPreview(targetDir, uiLibrary, answers.features);
    }

    // Auto-patch Tailwind to enable DaisyUI when the Daisy UI library is selected
    if (uiLibrary === "daisy") {
      logger.step("Patching Tailwind config for DaisyUI");
      await writeTailwindForDaisy(targetDir);
    }

    await runPluginHook("beforeComplete", enabledPluginIds, pluginRegistry, pluginContext);

    await patchReadme(targetDir, answers);
    await patchLintStaged(targetDir, answers.features);

    // Docker Compose generation (runtime-driven) — write docker-compose.yml
    if (answers.features.dockerCompose) {
      logger.step("Generating docker-compose.yml");
      await generateDockerCompose(targetDir, answers.features);
    }

    await runPluginHook("afterComplete", enabledPluginIds, pluginRegistry, pluginContext);
  } catch (error) {
    if (!dryRun) {
      await rollbackTargetDir(targetDir, logger).catch(() => {
        // Best-effort cleanup - the original error is what matters to the caller.
      });
    }
    throw error;
  }

  // Project metadata belongs to the generator contract, not only the CLI
  // wrapper, so programmatic consumers get the same maintenance lifecycle.
  await initializeProjectConfig(targetDir, enabledPluginIds, {
    packageManager: answers.packageManager,
    uiLibrary: answers.uiLibrary,
    template: answers.template,
    preset: answers.preset,
  });

  await hooks.run("afterGenerate", context);
  await runPluginHook("afterGenerate", enabledPluginIds, pluginRegistry, pluginContext);

  return { targetDir, pluginRegistry, pluginContext };
}

async function writeStorybookPreview(
  targetDir: string,
  uiLibrary: UiLibrary,
  features: FeatureFlags,
) {
  const sbDir = path.join(targetDir, ".storybook");
  await fs.ensureDir(sbDir);
  const previewPath = path.join(sbDir, "preview.ts");

  // Default preview content — imports global styles and sets basic parameters
  let content = `import type { Preview } from "@storybook/react";

import "../src/styles/globals.css";

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export default preview;
`;

  // Provider-aware decorators per UI library override
  if (uiLibrary === "ant") {
    content = `import type { Preview } from "@storybook/react";
import "../src/styles/globals.css";
import React from "react";
import { AntProvider } from "../src/providers/ant-provider";

export const decorators = [
  (Story) => (
    <AntProvider>
      <Story />
    </AntProvider>
  ),
];

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export default preview;
`;
  } else if (uiLibrary === "mantine") {
    content = `import type { Preview } from "@storybook/react";
import "../src/styles/globals.css";
import React from "react";
import { MantineProvider } from "../src/providers/mantine-provider";

export const decorators = [
  (Story) => (
    <MantineProvider>
      <Story />
    </MantineProvider>
  ),
];

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export default preview;
`;
  } else if (uiLibrary === "hero") {
    content = `import type { Preview } from "@storybook/react";
import "../src/styles/globals.css";
import React from "react";
import { HeroProvider } from "../src/providers/nextui-provider";

export const decorators = [
  (Story) => (
    <HeroProvider>
      <Story />
    </HeroProvider>
  ),
];

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export default preview;
`;
  } else if (uiLibrary === "chakra") {
    content = `import type { Preview } from "@storybook/react";
import "../src/styles/globals.css";
import React from "react";
import { ChakraAppProvider } from "../src/providers/chakra-provider";

export const decorators = [
  (Story) => (
    <ChakraAppProvider>
      <Story />
    </ChakraAppProvider>
  ),
];

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export default preview;
`;
  } else if (uiLibrary === "mui") {
    content = `import type { Preview } from "@storybook/react";
import "../src/styles/globals.css";
import React from "react";
import { MuiProvider } from "../src/providers/mui-provider";

export const decorators = [
  (Story) => (
    <MuiProvider>
      <Story />
    </MuiProvider>
  ),
];

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export default preview;
`;
  }

  // If MSW is enabled in features, initialize and include the MSW decorator
  if (features.msw) {
    content = `import { initialize, mswDecorator } from "msw-storybook-addon";\n${content}\ninitialize();\n\nexport const decorators = [mswDecorator].concat((typeof decorators !== 'undefined') ? decorators : []);`;
  }

  await fs.writeFile(previewPath, content, "utf8");
}

async function generateDockerCompose(targetDir: string, features: FeatureFlags) {
  const services: string[] = [];

  // app service (uses local Dockerfile if present)
  services.push(
    `  app:\n    build: .\n    ports:\n      - \"3000:3000\"\n    environment:\n      - NODE_ENV=development\n    depends_on:\n      - mailpit\n`,
  );

  if (features.prisma) {
    services.push(
      `  postgres:\n    image: postgres:15\n    environment:\n      - POSTGRES_PASSWORD=postgres\n    ports:\n      - \"5432:5432\"\n    volumes:\n      - pgdata:/var/lib/postgresql/data\n`,
    );
  }

  if (features.drizzle) {
    services.push(
      `  postgres:\n    image: postgres:15\n    environment:\n      - POSTGRES_PASSWORD=postgres\n    ports:\n      - \"5432:5432\"\n    volumes:\n      - pgdata:/var/lib/postgresql/data\n`,
    );
  }

  if (features.redis) {
    services.push(`  redis:\n    image: redis:7.2-alpine\n    ports:\n      - \"6379:6379\"\n`);
  }

  if (features.mailpit) {
    services.push(
      `  mailpit:\n    image: axllent/mailpit:latest\n    ports:\n      - \"8025:8025\"\n      - \"1025:1025\"\n`,
    );
  }

  const volumes = features.prisma || features.drizzle ? `\nvolumes:\n  pgdata:` : "";

  const compose = `version: '3.8'\nservices:\n${services.join("\n")}${volumes}\n`;

  await fs.writeFile(path.join(targetDir, "docker-compose.yml"), compose, "utf8");
}

async function writeTailwindForDaisy(targetDir: string) {
  const tailwindPath = path.join(targetDir, "tailwind.config.ts");
  if (!(await fs.pathExists(tailwindPath))) return;
  let content = await fs.readFile(tailwindPath, "utf8");

  // Add daisyui import if missing
  if (!content.includes("from 'daisyui'") && !content.includes("from \"daisyui\"")) {
    content = content.replace(
      /(import type \{ Config \} from \"tailwindcss\";\n\n)/,
      `$1import daisyui from 'daisyui';\n\n`,
    );
  }

  // Add daisyui plugin into plugins array
  if (!content.includes("daisyui")) {
    content = content.replace(/plugins: \[\],/, "plugins: [daisyui],");
  }

  // Add basic daisyui config if not present
  if (!content.includes("daisyui:")) {
    content = content.replace(
      /export default config;/,
      `config.daisyui = { themes: ['light', 'dark'] };\n\nexport default config;`,
    );
  }

  await fs.writeFile(tailwindPath, content, "utf8");
}

async function patchLintStaged(targetDir: string, features: FeatureFlags) {
  if (!features.husky) return;

  const pkgPath = path.join(targetDir, "package.json");
  const pkg = await fs.readJson(pkgPath);
  pkg["lint-staged"] = {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"],
  };
  await fs.writeJson(pkgPath, pkg, { spaces: 2 });
}

async function patchReadme(targetDir: string, answers: Answers) {
  const readmePath = path.join(targetDir, "README.md");
  let content = await fs.readFile(readmePath, "utf8");

  const featureLabels: Record<FeatureKey, string> = {
    prisma: "Prisma ORM",
    drizzle: "Drizzle ORM",
    betterAuth: "Better Auth",
    tanstackQuery: "TanStack Query",
    cypress: "Cypress (E2E)",
    vitest: "Vitest (unit tests)",
    storybook: "Storybook",
    docker: "Docker (multi-stage build)",
    dockerCompose: "Docker Compose (dev services)",
    husky: "Husky + lint-staged",
    pwa: "PWA support",
    bundleAnalyzer: "Bundle Analyzer",
    zustand: "Zustand client state",
    msw: "MSW API mocking",
    reactEmail: "React Email templates",
    playwright: "Playwright E2E tests",
    sentry: "Sentry monitoring",
    openapi: "OpenAPI typed client generation",
    redis: "Redis client",
    mailpit: "Mailpit (local email)",
    health: "Health & readiness endpoints",
    securityHeaders: "Security headers middleware",
    designSystem: "Design system & tokens",
    strapi: "Strapi CMS integration",
    animations: "Framer Motion animations",
    tanstackTable: "TanStack Table (data tables)",
    recharts: "Recharts (charts & visualizations)",
    tiptap: "Tiptap rich text editor",
    trpc: "tRPC (type-safe APIs)",
    graphql: "GraphQL (Yoga + typed client)",
    supabase: "Supabase (SSR client + auth + db)",
    ai: "Vercel AI SDK (Streaming & Chat UI)",
    openai: "OpenAI Model Provider",
    anthropic: "Anthropic Claude Provider",
    ollama: "Ollama Local Model Provider",
    storage: "File Storage & Uploads",
    realtime: "Real-time Events & Streaming",
    payments: "Payments & Billing Abstraction",
  };


  const scriptHints: Partial<Record<FeatureKey, string>> = {
    prisma: "| `db:generate` / `db:migrate` / `db:studio` / `db:seed` | Prisma |",
    drizzle: "| `db:generate` / `db:migrate` / `db:push` / `db:studio` | Drizzle ORM |",
    cypress: "| `cy:open` / `cy:run` | Cypress |",
    vitest: "| `test` / `test:watch` | Vitest |",
    storybook: "| `storybook` / `build-storybook` | Storybook |",
    bundleAnalyzer: "| `analyze` | Bundle analyzer build |",
    msw: "| `mock:api` | Initialize the MSW browser worker |",
    reactEmail: "| `email:dev` | Preview React Email templates |",
    playwright: "| `pw:test` / `pw:ui` / `pw:install` | Playwright E2E tests |",
    openapi: "| `api:types` | Generate TypeScript types from OpenAPI |",
    graphql: "| `codegen` | Generate TypeScript types from GraphQL schema/queries |",
  };


  const featureLines = (Object.entries(answers.features) as [FeatureKey, boolean][])
    .filter(([, enabled]) => enabled)
    .map(([key]) => `- ${featureLabels[key]}`)
    .join("\n");

  const scriptLines = (Object.entries(answers.features) as [FeatureKey, boolean][])
    .filter(([key, enabled]) => enabled && scriptHints[key])
    .map(([key]) => scriptHints[key])
    .join("\n");

  content = content
    .replaceAll("__PROJECT_NAME__", answers.projectName)
    .replace("__INSTALL_CMD__", installCommand(answers.packageManager))
    .replace("__DEV_CMD__", devCommand(answers.packageManager))
    .replace("__UI_LIBRARY__", uiLibraryLabel(answers.uiLibrary ?? "shadcn"))
    .replace("__FEATURE_LINES__", featureLines)
    .replace("__FEATURE_SCRIPT_LINES__", scriptLines);

  await fs.writeFile(readmePath, content, "utf8");
}

function uiLibraryLabel(uiLibrary: UiLibrary) {
  switch (uiLibrary) {
    case "mui":
      return "Material UI";
    case "chakra":
      return "Chakra UI";
    case "ant":
      return "Ant Design";
    case "mantine":
      return "Mantine";
    case "hero":
      return "NextUI / HeroUI";
    case "daisy":
      return "DaisyUI (Tailwind)";
    case "headless":
      return "Headless UI";
    case "shadcn":
    default:
      return "shadcn-style primitives";
  }
}