Repository: nova (Next.js project generator)

Build / Dev / Test / Lint commands
- Root scripts (run from repo root):
  - pnpm install
  - pnpm build        # builds @nova/core and bundles CLI (npm run build uses tsup)
  - pnpm dev          # runs CLI against source via tsx (fast iteration)
  - pnpm typecheck    # runs type checks for @nova/core then root tsc --noEmit
  - npm start         # runs compiled CLI (node ./bin/nova.js)

- Workspace (@nova/core) commands (from repo root using npm/pnpm workspaces):
  - npm run build --workspace=@nova/core
  - npm run typecheck --workspace=@nova/core

- Smoke test / generator validation:
  - node scripts/smoke-test.mjs

High-level architecture (big picture)
- Purpose: CLI generator that copies a base Next.js template and overlays optional add-on folders to produce a ready project.
- Core areas:
  - src/generator.ts   : high-level generator logic (copies templates, applies add-ons, writes package.json)
  - templates/base/    : base Next.js App Router project (complete app layout, providers, docs)
  - templates/addons/  : optional feature overlays (prisma, vitest, cypress, msw, sentry, ui libraries, etc.). Add-ons are plain folders that overwrite base files when applied.
  - packages/core/     : framework-agnostic shared utilities (fs/template copying, pm commands, prompts handling, logging). Built and then bundled into the CLI.
  - bin/nova.js        : published CLI entrypoint (built artifact used by npm start or npx)
  - scripts/smoke-test.mjs : end-to-end smoke test that generates sample projects and asserts expected files exist
- Workflow summary: CLI prompts -> generateProject constructs target tree by copying templates/base -> overlays matching addons selected -> packageManifest builds package.json from feature set -> optional git init / install

Key conventions and repository-specific notes
- Add-on overlay model: any folder under templates/addons with matching path names will be copied on top of templates/base. Overlay files win (they replace base files) — there's no merge logic.
- UI overlays: templates/ui/* (mui, chakra, or default shadcn primitives) are overlaid last to wire providers and example components.
- Package manifest generation: src/packageManifest.ts produces package.json scripts and dependencies based on selected features. Inspect it when changing how features map to dependencies or scripts.
- @nova/core is a real workspace package (packages/core). Run install at repo root before build/dev so editors and tsc path mappings (tsconfig) resolve it.
- Fast iteration: use pnpm dev (root) to run CLI against source via tsx so changes to src/ are picked up without rebuilding.
- Typechecking/build: build runs the workspace package build first (npm run build --workspace=@nova/core) then tsup to produce bundled CLI; prepublish hooks run typecheck + build.
- Smoke tests: scripts/smoke-test.mjs exercises many add-ons and validates presence of key files — useful reference for expected outputs.

Files to check when changing generator behavior
- src/generator.ts
- src/packageManifest.ts
- templates/base/** and templates/addons/**
- packages/core/src/fs.ts and src/pmCommands.ts (copying and package-manager resolution)
- scripts/smoke-test.mjs (for generation expectations)

AI-assistant guidance
- When proposing changes to generated project structure, update templates/ and packageManifest.ts together.
- Prefer small, surgical edits: add-ons intentionally overwrite base files; be explicit when adding conflict-prone files.
- Use smoke-test.mjs locally to validate changes to generation behavior.

MCP Servers
- Would you like to configure any MCP servers relevant to the project (e.g., Playwright or Storybook)? If yes, specify which one to configure.

Summary
Created .github/copilot-instructions.md capturing build/test commands, architecture overview, and repo-specific conventions. Want any additions (e.g., more commands, CI notes, or deeper mapping of add-ons to scripts)?