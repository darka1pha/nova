Repository: nova (Next.js project generator)

Build / Dev / Test / Lint commands

- Root scripts (run from repo root):
  - pnpm install
  - pnpm build # builds @nova/core and bundles CLI (npm run build uses tsup)
  - pnpm dev # runs CLI against source via tsx (fast iteration)
  - pnpm typecheck # runs type checks for @nova/core then root tsc --noEmit
  - npm run verify:manifest-sync # regression guard: buildPackageJson() must match FEATURE_CONTRIBUTIONS per feature
  - npm start # runs compiled CLI (node ./bin/nova.js)

- Workspace (@nova/core) commands (from repo root using npm/pnpm workspaces):
  - npm run build --workspace=@nova/core
  - npm run typecheck --workspace=@nova/core

- Smoke test / generator validation:
  - node scripts/smoke-test.mjs

- Manifest sync check (dependency-drift regression guard):
  - tsx scripts/verify-package-manifest-sync.ts
  - Historically packageManifest.ts (full generation) and
    featurePackageAdditions.ts (`nova add`) were hand-duplicated and could
    drift. Both now read from the single src/featureContributions.ts map,
    so drift is structurally impossible - this script guards against a
    future regression. Runs automatically in `npm run prepublishOnly` and
    CI's verify job.

- Inspecting plugins from the CLI:
  - `nova plugins` lists every plugin with its description, requires/
    conflicts, supported UI libraries, and package.json footprint.
  - `nova plugins <feature>` shows the same detail for one plugin.
  - Backed by src/generator/pluginInfo.ts, which joins ADDON_FOLDERS,
    PLUGIN_METADATA, and FEATURE_CONTRIBUTIONS - there's no separate data
    to maintain for this command.

High-level architecture (big picture)

- Purpose: CLI generator that copies a base Next.js template and overlays optional add-on folders to produce a ready project.
- Core areas:
  - src/index.ts : CLI entrypoint; dispatches `nova [name]`, `nova add`, and `nova plugins`
  - src/generator.ts : high-level generator orchestration (builds an operation plan, executes it, runs config patchers, writes package.json)
  - src/generator/ : generator internals - context, logger, hooks, operations/plan execution, plugin metadata + validation, pluginInfo (metadata+footprint join used by `nova plugins`), config patchers (next.config/providers/middleware), and the manifest-sync regression guard
  - src/featureContributions.ts : single source of truth for what each feature contributes to package.json (dependencies/devDependencies/scripts); consumed by packageManifest.ts (full generation), featurePackageAdditions.ts (`nova add`, a thin re-export), and pluginInfo.ts (`nova plugins`)
  - templates/base/ : base Next.js App Router project (complete app layout, providers, docs)
  - templates/addons/ : optional feature overlays (prisma, vitest, cypress, msw, sentry, ui libraries, etc.). Add-ons are plain folders that overwrite base files when applied.
  - packages/core/ : framework-agnostic shared utilities (fs/template copying, pm commands, prompts handling, logging). Built and then bundled into the CLI.
  - bin/nova.js : published CLI entrypoint (built artifact used by npm start or npx)
  - scripts/smoke-test.mjs : end-to-end smoke test that generates sample projects and asserts expected files exist
  - scripts/verify-package-manifest-sync.ts : regression guard asserting buildPackageJson() output matches FEATURE_CONTRIBUTIONS per-feature
- Workflow summary: CLI prompts -> generateProject validates the plugin selection -> builds an operation plan (copy base, copy selected addons, copy UI overlay) -> executes the plan (rolling back the target dir on failure) -> packageManifest builds package.json from feature set + FEATURE_CONTRIBUTIONS -> config patchers (next.config/providers/middleware) run -> optional git init / install

Key conventions and repository-specific notes

- Add-on overlay model: any folder under templates/addons with matching path names will be copied on top of templates/base. Overlay files win (they replace base files) — there's no merge logic.
- UI overlays: templates/ui/\* (mui, chakra, or default shadcn primitives) are overlaid last to wire providers and example components.
- Config patching: next.config.mjs, the provider tree, and middleware.ts are patched via ordered declarative contributions in src/generator/patchers/\*.ts (feature flag -> transform), not ad hoc string-replace in generator.ts.
- Plugin metadata: src/generator/pluginMetadata.ts holds per-plugin name/description/requires/conflicts/supportedUI, checked by src/generator/validators.ts before any files are written, and surfaced to users via `nova plugins` (src/generator/pluginInfo.ts).
- Package manifest generation: a feature's dependencies/devDependencies/scripts are declared exactly once, in src/featureContributions.ts. src/packageManifest.ts (full generation), src/featurePackageAdditions.ts (`nova add`), and src/generator/pluginInfo.ts (`nova plugins`) all consume it directly - do not add feature-specific deps/scripts anywhere else. `npm run verify:manifest-sync` guards against regressions here.
- @nova/core is a real workspace package (packages/core). Run install at repo root before build/dev so editors and tsc path mappings (tsconfig) resolve it.
- Fast iteration: use pnpm dev (root) to run CLI against source via tsx so changes to src/ are picked up without rebuilding.
- Typechecking/build: build runs the workspace package build first (npm run build --workspace=@nova/core) then tsup to produce bundled CLI; prepublish hooks run typecheck + verify:manifest-sync + build.
- Smoke tests: scripts/smoke-test.mjs exercises many add-ons and validates presence of key files — useful reference for expected outputs.

Files to check when changing generator behavior

- src/generator.ts
- src/generator/patchers/\*.ts (config patching contributions)
- src/generator/pluginMetadata.ts, src/generator/pluginInfo.ts, and src/generator/validators.ts
- src/featureContributions.ts (single source for feature -> package.json contributions)
- templates/base/** and templates/addons/**
- packages/core/src/fs.ts and src/pmCommands.ts (copying and package-manager resolution)
- scripts/smoke-test.mjs (for generation expectations)

AI-assistant guidance

- When proposing changes to generated project structure, update templates/ and src/featureContributions.ts together.
- If a feature adds dependencies/scripts, add them only to src/featureContributions.ts - packageManifest.ts, nova add, and `nova plugins` all pick it up automatically. Do not hand-edit featurePackageAdditions.ts (it's a re-export).
- If a plugin has real cross-plugin constraints (requires another plugin, conflicts with one, or only supports certain UI libraries), declare them in src/generator/pluginMetadata.ts so validation and `nova plugins` both reflect it.
- Prefer small, surgical edits: add-ons intentionally overwrite base files; be explicit when adding conflict-prone files.
- Use smoke-test.mjs locally to validate changes to generation behavior.

MCP Servers

- Would you like to configure any MCP servers relevant to the project (e.g., Playwright or Storybook)? If yes, specify which one to configure.

Summary
Created .github/copilot-instructions.md capturing build/test commands, architecture overview, and repo-specific conventions. Want any additions (e.g., more commands, CI notes, or deeper mapping of add-ons to scripts)?
