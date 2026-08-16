import fs from "fs-extra";
import path from "node:path";
import type { PluginCategory } from "../plugin/types.js";
import { isValidPluginId } from "../registry/index.js";

export interface ScaffoldPluginOptions {
  name: string;
  targetDir: string;
  category?: PluginCategory;
  description?: string;
  author?: string;
}

export async function scaffoldPlugin(options: ScaffoldPluginOptions): Promise<{ pluginDir: string; files: string[] }> {
  const pluginName = options.name.trim();
  if (!isValidPluginId(pluginName)) {
    throw new Error(`Invalid plugin name "${pluginName}". Use alphanumeric characters, dashes, and optional @scope/.`);
  }

  const sanitizedDirName = pluginName.replace(/^@[^/]+\//, "");
  const pluginDir = path.resolve(options.targetDir, sanitizedDirName);

  if (await fs.pathExists(pluginDir)) {
    const existing = await fs.readdir(pluginDir);
    if (existing.length > 0) {
      throw new Error(`Directory "${pluginDir}" already exists and is not empty.`);
    }
  }

  await fs.ensureDir(pluginDir);

  const filesWritten: string[] = [];

  // 1. package.json
  const packageJson = {
    name: pluginName.startsWith("@") ? pluginName : `@nova/plugin-${pluginName}`,
    version: "0.1.0",
    description: options.description ?? `Nova plugin for ${pluginName}`,
    main: "dist/index.js",
    types: "dist/index.d.ts",
    type: "module",
    scripts: {
      build: "tsc",
      test: "nova plugin test",
      validate: "nova plugin validate",
    },
    keywords: ["nova", "nova-plugin", options.category ?? "developer-experience"],
    author: options.author ?? "",
    license: "MIT",
    devDependencies: {
      "@darkalpha/nova": "^0.2.2",
      typescript: "^5.7.2",
    },
    novaPlugin: {
      id: pluginName,
      name: options.name,
      category: options.category ?? "developer-experience",
      version: "0.1.0",
      compatibility: {
        nova: ">=0.1.0",
      },
    },
  };

  await fs.writeJson(path.join(pluginDir, "package.json"), packageJson, { spaces: 2 });
  filesWritten.push("package.json");

  // 2. tsconfig.json
  const tsconfig = {
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      declaration: true,
      outDir: "./dist",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    },
    include: ["src/**/*"],
    exclude: ["node_modules", "dist", "tests"],
  };

  await fs.writeJson(path.join(pluginDir, "tsconfig.json"), tsconfig, { spaces: 2 });
  filesWritten.push("tsconfig.json");

  // 3. README.md
  const readme = `# ${pluginName}

${options.description ?? `A Nova plugin providing ${pluginName} capabilities.`}

## Installation

\`\`\`bash
nova add ${pluginName}
\`\`\`

## Development

\`\`\`bash
npm run validate   # Validate plugin manifest and paths
npm run test       # Test plugin lifecycle and integration
npm run build      # Build plugin bundle
\`\`\`
`;

  await fs.writeFile(path.join(pluginDir, "README.md"), readme, "utf8");
  filesWritten.push("README.md");

  // 4. src/manifest.ts
  const srcDir = path.join(pluginDir, "src");
  await fs.ensureDir(srcDir);

  const manifestTs = `import type { PluginManifest } from "@darkalpha/nova";
import { validatePlugin } from "./validate.js";
import { pluginHooks } from "./hooks.js";

export const manifest: PluginManifest = {
  id: "${pluginName}",
  name: "${options.name}",
  version: "0.1.0",
  description: "${options.description ?? `Nova plugin for ${pluginName}`}",
  category: "${options.category ?? "developer-experience"}",
  author: "${options.author ?? "Community"}",
  license: "MIT",
  trustLevel: "community",
  compatibility: {
    nova: ">=0.1.0",
  },
  capabilities: ["developer-experience"],
  dependencies: {},
  devDependencies: {},
  scripts: {},
  env: [],
  hooks: pluginHooks,
  validate: validatePlugin,
};
`;

  await fs.writeFile(path.join(srcDir, "manifest.ts"), manifestTs, "utf8");
  filesWritten.push("src/manifest.ts");

  // 5. src/validate.ts
  const validateTs = `import type { PluginResolutionContext, PluginValidationResult } from "@darkalpha/nova";

export function validatePlugin(ctx: PluginResolutionContext): PluginValidationResult {
  // Add any custom configuration or environment validation checks here
  return {
    ok: true,
    errors: [],
  };
}
`;

  await fs.writeFile(path.join(srcDir, "validate.ts"), validateTs, "utf8");
  filesWritten.push("src/validate.ts");

  // 6. src/hooks.ts
  const hooksTs = `import type { PluginHooks } from "@darkalpha/nova";

export const pluginHooks: PluginHooks = {
  beforeGenerate(ctx) {
    // Fired before generator writes files
  },
  afterGenerate(ctx) {
    // Fired after generation completes
  },
};
`;

  await fs.writeFile(path.join(srcDir, "hooks.ts"), hooksTs, "utf8");
  filesWritten.push("src/hooks.ts");

  // 7. src/index.ts
  const indexTs = `export { manifest, manifest as default } from "./manifest.js";
export * from "./validate.js";
export * from "./hooks.js";
`;

  await fs.writeFile(path.join(srcDir, "index.ts"), indexTs, "utf8");
  filesWritten.push("src/index.ts");

  // 8. src/templates/example.ts
  const templatesDir = path.join(srcDir, "templates");
  await fs.ensureDir(templatesDir);
  await fs.writeFile(
    path.join(templatesDir, "example.ts"),
    `// Template file contributed by ${pluginName}\nexport const example = true;\n`,
    "utf8",
  );
  filesWritten.push("src/templates/example.ts");

  // 9. tests/plugin.test.ts
  const testsDir = path.join(pluginDir, "tests");
  await fs.ensureDir(testsDir);
  const testTs = `import assert from "node:assert/strict";
import { manifest } from "../src/manifest.js";

assert.equal(manifest.id, "${pluginName}");
assert.equal(manifest.version, "0.1.0");
console.log("✓ Plugin manifest tests passed");
`;

  await fs.writeFile(path.join(testsDir, "plugin.test.ts"), testTs, "utf8");
  filesWritten.push("tests/plugin.test.ts");

  return { pluginDir, files: filesWritten };
}
