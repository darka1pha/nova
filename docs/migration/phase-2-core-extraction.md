# Phase 2: Core Extraction

## What changed

A new workspace package, `packages/core` (published internally as
`@helix/core`), now owns four pieces of framework-agnostic logic that
previously lived in `src/utils/`:

| Old location | New location | Export |
|---|---|---|
| `src/utils/copyTemplate.ts` | `packages/core/src/fs.ts` | `copyTemplateDir`, `pathExists`, `joinAddon` |
| `src/utils/pmCommands.ts` | `packages/core/src/pmCommands.ts` | `PackageManager`, `installCommand`, `devCommand`, `execArgs` |
| local `bail()` in `src/prompts.ts` | `packages/core/src/prompts.ts` | `bail` |
| *(new)* | `packages/core/src/logger.ts` | `logger` |

`src/generator.ts`, `src/prompts.ts`, `src/index.ts`, and `src/types.ts` now
import these from `"@helix/core"`. The old `src/utils/copyTemplate.ts` and
`src/utils/pmCommands.ts` files are kept as deprecated re-export shims —
nothing that imported from them before is broken.

The root `package.json` gained a `"workspaces": ["packages/*"]` field and a
regular dependency on `@helix/core`, resolved locally via npm/pnpm/yarn
workspace linking (no publish step required for local development).

## Why this change is needed

The end-state architecture (`packages/core`, `plugins/*`, `packages/plugin-sdk`,
etc.) requires a shared, feature-agnostic foundation that both the CLI *and*
every future plugin can depend on without depending on each other. Before
this phase, `copyTemplateDir` and the package-manager helpers were private to
the CLI package (`src/utils/`), so a plugin living in its own package
(Phase 3 onward) would have had no legitimate way to reuse them short of
duplicating the code or reaching into the CLI's internals.

Extracting this now — before the plugin loader (Phase 4) or the SDK
(Phase 7) — means every later phase builds directly on `@helix/core` instead
of on CLI-internal modules that would need a second migration later.

## Advantages

- **No behavior change.** Every function moved verbatim; only the import
  path changed. `scripts/smoke-test.mjs` should pass unmodified.
- **Establishes the workspace boundary early.** Phase 3's `plugins/next`
  package can depend on `@helix/core` the same way the CLI does, instead of
  a special-cased relative import across package boundaries.
- **Backward compatible.** `src/utils/copyTemplate.ts` and
  `src/utils/pmCommands.ts` still export the same names; anything importing
  from those paths keeps working, with a `@deprecated` JSDoc pointing at the
  replacement.
- **Smaller, focused files.** `packages/core/src/*.ts` are each under 40
  lines and single-purpose, versus utilities that previously lived
  alongside CLI-specific code.

## Tradeoffs

- **One more package to build.** `npm run build` now builds `@helix/core`
  before the root `tsc` pass (see the updated `build` script). This adds a
  step to local setup (`npm install` must run first so the workspace
  symlink for `@helix/core` exists) but is a one-time cost.
- **`bail()` moved out of `prompts.ts`.** Anyone who previously imported the
  unexported local `bail` (impossible before, since it wasn't exported) is
  unaffected; this is purely additive.
- **Root `tsconfig.json` gained a `paths` mapping** to `packages/core/src`
  so editors/`tsc --noEmit` resolve `@helix/core` correctly even before a
  workspace install/build has happened. This mapping is a dev-time
  convenience only — the actual `build`/`start` scripts rely on the real
  workspace-linked package, not the path mapping.

## Migration notes for contributors

- New code in `src/` (or, from Phase 3 onward, in `plugins/*`) should import
  from `"@helix/core"`, not from `src/utils/*`.
- Do not add new exports to `src/utils/copyTemplate.ts` or
  `src/utils/pmCommands.ts` — add them to the corresponding file in
  `packages/core/src/` instead, and re-export from the shim only if a
  backward-compatible name is genuinely needed.
- Before running `npm run build`, `npm run dev`, or `npm run typecheck` for
  the first time after pulling this change, run `npm install` at the repo
  root so the `@helix/core` workspace package gets linked into
  `node_modules`.

## Next phase

Phase 3 converts the current Next.js generator (`templates/base` +
the non-feature parts of `generator.ts`) into the first real plugin,
`plugins/next`, which will depend on `@helix/core` exactly as the CLI does
today.
