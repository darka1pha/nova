# Changelog

All notable changes to **Nova** (the CLI/generator itself, not the projects it produces) are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions and, where practical, [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added

- **Project manifest (`.nova.json`)** — generated projects now carry a versioned Nova manifest recording selected plugins, package manager, and UI library. It is written by both `generateProject()` and `nova add`.
- **Project maintenance commands** — added `nova init`, `nova info`, `nova status`, `nova doctor`, `nova validate`, `nova clean`, `nova diff`, `nova remove`, `nova upgrade`, and `nova repair`, all supporting `--path <dir>`.
- **Plugin discovery and automation** — added `nova list [search-term]`, `nova list --installed`, `nova search <term>`, plus `--json` output for maintenance and discovery commands.
- **Maintenance smoke coverage** — `scripts/smoke-test.mjs` now asserts generated `.nova.json` metadata.

- **`nova plugins [feature]`** — a new CLI command to inspect plugins without reading source. With no argument, lists every plugin with its description, `requires`/`conflicts` constraints, supported UI libraries, and a summary of its `package.json` footprint. With a feature name, shows the same detail for a single plugin.
- **`src/generator/pluginInfo.ts`** — `getPluginInfo()`, `listAllPluginInfo()`, and `summarizeFootprint()`, joining `addonRegistry.ts`, `pluginMetadata.ts`, and `featureContributions.ts` into one queryable view per plugin. Powers `nova plugins`; also intended as the foundation for future `nova doctor` / `nova upgrade` / `nova remove` commands.
- **`src/generator/pluginMetadata.ts`** — declarative per-plugin metadata (`name`, `description`, `requires`, `conflicts`, `supportedUI`) for every `FeatureKey`.
- **`src/generator/validators.ts`** — `validatePluginSelection()`, which checks a feature selection against `pluginMetadata.ts` **before any files are written**, throwing `MissingPluginDependencyError` or `PluginConflictError` on an invalid combination.
- **`src/generator/context.ts`** — `buildGeneratorContext()`, producing a single, frozen `GeneratorContext` (paths, resolved UI library, logger, dry-run/verbose flags) threaded through generation instead of recomputing values ad hoc.
- **`src/generator/logger.ts`** — a small structured logger (`debug` / `verbose` / `info` / `success` / `warn` / `error` / `step`) with a CI-aware minimum log level, replacing scattered `console.log` calls in the generator.
- **`src/generator/errors.ts`** — typed error classes (`NovaGeneratorError`, `InvalidProjectNameError`, `DirectoryNotEmptyError`, `UnknownPluginError`, `PluginConflictError`, `MissingPluginDependencyError`, `MissingTemplateError`, `OperationExecutionError`) so generator failures are identifiable and carry actionable messages.
- **`src/generator/operations.ts`** — `Operation` / `OperationPlan` types and `executePlan()`, representing file writes as data (`mkdir`, `copyDir`, `writeFile`, `writeJson`) executed sequentially, plus `rollbackTargetDir()` to remove a partially-generated project directory if generation fails midway. Lays the groundwork for a future `--dry-run` flag without further architectural changes.
- **`src/generator/hooks.ts`** — a minimal `HookRegistry` supporting `beforeGenerate` / `afterGenerate` / `beforePlugin` / `afterPlugin` / `beforeWrite` / `afterWrite` lifecycle hooks for future extensibility.
- **`src/generator/patchers/`** — declarative config-patching system for `next.config.mjs` (`nextConfigPatcher.ts`), the provider tree (`providerPatcher.ts`), and `middleware.ts` (`middlewarePatcher.ts`), each expressed as an ordered list of feature-gated contributions instead of inline `if` chains previously embedded in `generator.ts`. `middlewarePatcher.ts` also introduces an explicit idempotency marker so re-applying a middleware contribution can never double-wrap the exported handler.
- **`src/featureContributions.ts`** — single source of truth for every feature's `package.json` contribution (dependencies, devDependencies, scripts). Both `src/packageManifest.ts` (full generation) and `nova add` now read from this one map.
- **`src/generator/verifyManifestSync.ts`** and **`scripts/verify-package-manifest-sync.ts`** — a regression guard (`npm run verify:manifest-sync`) confirming `buildPackageJson()`'s per-feature output matches `featureContributions.ts`. Wired into `npm run prepublishOnly` and the CI `verify` job.
- **`.github/workflows/npm-publish.yml`** — the `release` job now also runs on manual `workflow_dispatch` runs (previously it only ran on `git push` of a `v*` tag and showed as skipped on any manual dispatch). A new `Resolve release tag` step derives the release tag from `package.json`'s version on manual dispatches (since `github.ref_name` is a branch name, not a version tag, in that case), while continuing to use the pushed tag directly on tag-push runs.

### Changed

- **`nova add`** now records successfully added plugins in `.nova.json` after its plugin lifecycle completes. CLI help and the README now document maintenance commands, JSON output, and project metadata.
- **`nova upgrade`** reconciles tracked plugin package declarations without rewriting application source; **`nova repair`** fixes deterministic manifest and `.env.example` drift only.

- **`generateProject()` (`src/generator.ts`)** now: validates the plugin selection up front via `validatePluginSelection()`; builds an `OperationPlan` (copy base template → copy selected addons → copy UI overlay) and executes it via `executePlan()` instead of copying directories inline; rolls back the target directory via `rollbackTargetDir()` if any step fails after files have started being written; and runs the new `patchers/` modules (`patchNextConfig`, `patchAppProviders`, `patchMiddleware`) instead of the previous inline string-replace logic for `next.config.mjs`, the provider tree, and `middleware.ts`.
- **`src/packageManifest.ts`**'s `buildPackageJson()` replaced ~25 sequential `if (features.x) { ... }` blocks with a single loop over `FEATURE_CONTRIBUTIONS`, reading each enabled feature's dependencies/devDependencies/scripts from the shared map instead of hand-written conditionals.
- **`src/featurePackageAdditions.ts`** is now a thin backward-compatible re-export of `FEATURE_CONTRIBUTIONS` (from `featureContributions.ts`). Its exported name (`FEATURE_PACKAGE_ADDITIONS`) and shape are unchanged, so `src/add.ts` and any external consumers keep working without modification.
- **`GenerateProjectOptions`** (`src/types.ts`) gained two new, optional, additive fields: `dryRun` and `verbose`. Neither is currently wired into the CLI's argument parsing — they exist so a future `nova generate --dry-run` / `--verbose` flag can be added without further changes to `generateProject()`'s internals.

### Fixed

- Programmatic `generateProject()` calls now write the same project manifest as the CLI and preserve the package manager selected during generation.
- `nova search database` now finds database-category plugins even when their display name or description lacks the search term.

- Eliminated the possibility of `src/packageManifest.ts` (full generation) and `src/featurePackageAdditions.ts`/`nova add` silently disagreeing about a feature's dependencies or scripts. Previously these were two hand-maintained files that had to be kept in sync manually (see prior `docs/nova-add-command.md` and README warnings about this); they now derive from the same `featureContributions.ts` map, so this class of drift is structurally impossible rather than merely detected.
- A failed `generateProject()` call no longer leaves a partially-generated project directory on disk — the target directory (which Nova only ever creates fresh, or confirms was empty beforehand) is now removed automatically on failure.
- **`src/generator/templatesRoot.ts`**'s `resolveTemplatesRoot()` no longer silently falls back to a guessed, possibly-nonexistent `templates/` path when it can't find `templates/base` by walking up from the calling file's directory. Previously, when the walk-up search failed, the function returned an unverified fallback candidate anyway, which surfaced downstream as a confusing `ENOENT ... lstat '.../templates/base'` error deep inside `executePlan()` (e.g. in CI, during `scripts/smoke-test.mjs`) with no indication of what had actually been searched. It now throws immediately with the full list of directories it checked, making a resolution failure self-diagnosing (stale `dist/` build vs. genuinely missing `templates/` directory) instead of requiring a debugging session to track down.

### Internal / Non-breaking

- No changes to generated project output. Every refactor in this release preserves byte-identical files for every existing feature/UI-library combination, verified against `scripts/smoke-test.mjs`.
- No changes to any existing CLI command's arguments, flags, exit codes, or observable behavior. `nova <name>`, `nova add`, `-h`/`--help`, and `-v`/`--version` all behave exactly as before; `nova plugins` is purely additive.
- `docs/migration/phase-2-core-extraction.md`-style deprecation shims (`src/utils/copyTemplate.ts`, `src/utils/pmCommands.ts`) are unaffected by this pass.
- Removed unused local one-off scripts (`scripts/fix-client-auth.js`, `scripts/fix-client-auth.cjs`) that were never referenced by `package.json`, `tsup.config.ts`, or CI, and hard-coded an absolute Windows path — dead weight left over from a one-time local repair.

---

## [0.1.7] - prior release

Baseline referenced by this changelog's `[Unreleased]` section. See git history for details predating this changelog's introduction.

---

[Unreleased]: https://github.com/darka1pha/nova/compare/v0.1.6...HEAD
[0.1.7]: https://github.com/darka1pha/nova/releases/tag/v0.1.6
