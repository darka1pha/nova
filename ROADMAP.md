# Nova Roadmap

This is the plan for the next Nova releases, ordered by priority. Each release has a goal and a list of concrete work items. For what has already shipped, see [`changelog.md`](./changelog.md).

Last reviewed: 2026-10-31 (against v0.2.4 plus the unreleased fixes).

**Guiding rule:** a generated project must install, typecheck, and build with no manual edits, for every supported combination of template, UI library, plugin, and package manager. Work that protects that rule comes before new features.

---

## 0.2.5 — Generated projects that work

**Goal:** fix the bugs that made freshly generated projects fail to compile, install, or deploy.

Status: done, listed under `[Unreleased]` in the changelog.

- [x] Mantine provider compiles; Ant, Mantine, and HeroUI providers are mounted.
- [x] Storybook preview is valid TSX with or without a UI library or MSW.
- [x] DaisyUI and HeroUI are registered in `tailwind.config.ts`.
- [x] `docker-compose.yml` is valid for every feature combination.
- [x] Docker images build without a `public/` folder and with Bun; `nova deploy docker` enables `output: "standalone"`.
- [x] Deployment configs use the project's package manager.
- [x] tRPC v11 (compatible with TanStack Query v5); React 19-compatible UI library versions.
- [x] Template-coupled packages stay within their declared major.
- [x] Generated apps start at version `0.1.0`.

---

## 0.3.0 — Prove it, and make `nova add` match `nova create`

**Goal:** catch broken output automatically, and make adding a feature later produce the same result as choosing it at creation time.

### Test what users actually get

- [ ] **Generated-app CI job.** Generate a matrix of sample projects (each UI library; tRPC; Storybook + MSW; Docker + Compose; each package manager) and run `install`, `typecheck`, and `build` on each. None of the existing unit, integration, or smoke tests do this, which is why the 0.2.5 bugs shipped.
- [ ] **Windows and Linux in CI**, plus Node 20 and the latest LTS.
- [ ] **Snapshot tests** for patched files (`app-providers.tsx`, `next.config.mjs`, `tailwind.config.ts`, `proxy.ts`, `.storybook/preview.tsx`, `docker-compose.yml`).
- [ ] **Add `.gitattributes` (`* text=auto eol=lf`)** so templates are LF in every checkout, and fail CI if a template contains CRLF.

### One pipeline for `create` and `add`

- [ ] **`nova add` runs the same config patchers as generation.** Today `nova add tanstackQuery`, `trpc`, `pwa`, `sentry`, `bundleAnalyzer`, `storybook`, or `dockerCompose` copies files but never wires providers, `next.config`, the Storybook preview, or Compose services.
- [ ] **`nova add` validates against installed plugins**, not just the requested ones (e.g. adding `drizzle` to a Prisma project should be rejected; a requirement that's already installed should count as satisfied).
- [ ] **Don't run interactive plugin prompts while the spinner is active** in `nova add`.
- [ ] **Patch targets respect the project layout.** Patches hard-code `src/…`, so projects without a `src/` folder are silently skipped.
- [ ] **Patchers fail loudly** when an expected anchor isn't found, instead of silently doing nothing.

### Correctness fixes still open from the audit

- [ ] **Read-only commands shouldn't write files.** `info`, `status`, `doctor`, `diff`, and `list --installed` can create or reconstruct `.nova/project.json` as a side effect.
- [ ] **`nova repair` always reports `.nova/project.json` as repaired,** so it never says "nothing needed repair".
- [ ] **Env checks use substring matching** (`content.includes(key)`) in `doctor`, `diff`, and `repair`; use the real `KEY=` parser from `applyEnv.ts`. `.gitignore` repair has the same problem (`.env` matches `.env.example`).
- [ ] **`resolveFeatureKey("constructor")` resolves**, because `in` matches inherited object properties; use `Object.hasOwn`.
- [ ] **`nova clean` deletes `dist/` without confirmation.**
- [ ] **`nova remove` can delete dependencies the user's own code still imports,** and `--force` leaves dependents broken.
- [ ] **Prisma's `provider` prompt answer is ignored**; the schema is always PostgreSQL.
- [ ] **`--json` mode** should print errors as JSON and set a non-zero exit code consistently.
- [ ] **Project names** allow uppercase and leading `-`/`_`, which npm rejects.
- [ ] **Git setup** fails when `user.name` isn't configured, and commits before install, so the lockfile isn't included.
- [ ] **Base template auth demo:** `API_BASE_URL` can be undefined, `config/env.ts` is never imported, and `/dashboard` is unprotected.

### Repo hygiene

- [ ] Remove the empty `package.json.tmp` files and the committed `test-drizzle-app/` fixture.
- [ ] Pick one lockfile (`package-lock.json` or `pnpm-lock.yaml`).
- [x] Fix the README's `CHANGELOG.md` link (the file is `changelog.md`, and GitHub links are case-sensitive).

---

## 0.4.0 — Single source of truth and a modern stack

**Goal:** make each plugin one self-contained manifest, then move templates to current major versions.

### Architecture

- [ ] **Finish the native plugin migration.** A feature's data is still spread across `FeatureKey`, `ADDON_FOLDERS`, `PLUGIN_METADATA`, `FEATURE_CONTRIBUTIONS`, `FEATURE_OPTIONS`, the generator's README labels, `LEGACY_CATEGORY`, and the resolver. Each plugin should be one file under `src/plugin/nativePlugins/`.
- [ ] **One place for UI-library data.** Dependencies, detection markers, providers, and Storybook decorators are currently duplicated across `packageManifest.ts`, `resolver/packageRequirements.ts`, `add.ts`, `project.ts`, and the generator.
- [ ] **One package-manager detector.** `add.ts`, `project.ts`, and `utils/packageManager.ts` each have their own.
- [ ] **Resolver safety by default.** Resolve within declared ranges unless a package is explicitly marked as safe to float, instead of maintaining an allow-list of pinned packages.
- [ ] **AST-based patchers** (e.g. `magicast` or `ts-morph`) instead of exact string replacement.

### Stack upgrades (each needs template changes, not just a version bump)

- [ ] Tailwind CSS v4 (unlocks daisyUI 5 and HeroUI 2.8+).
- [ ] Zod 4.
- [ ] Storybook 9+ (`addon-essentials` is folded into core).
- [ ] Vitest 3+.
- [ ] Sentry v10 with `instrumentation.ts` / `instrumentation-client.ts` instead of `sentry.*.config.ts`.
- [ ] PWA via Serwist instead of the unmaintained `next-pwa`, with a real service worker.
- [ ] `motion` instead of `framer-motion` for the animations plugin.
- [ ] Mantine 8 and Headless UI updates as they become stable on React 19.

### Deployment polish

- [ ] Cloudflare provider targets OpenNext instead of `wrangler pages deploy .next`.
- [ ] Drop the deprecated `X-XSS-Protection` header from the Vercel config.
- [ ] The Vercel workflow shouldn't try to deploy pull requests from forks, which don't have secrets.

---

## 0.5.0 — Safer upgrades and more plugins

**Goal:** let existing projects take template updates safely, and widen the plugin catalog.

### Upgrades without losing edits

- [ ] Record template file hashes in `.nova/project.json`.
- [ ] `nova upgrade --files` updates files the user hasn't touched and shows a 3-way diff for files they have.
- [ ] Codemods for framework upgrades (e.g. `nova migrate tailwind4`).
- [ ] `nova add --dry-run` with a diff preview and confirmation, and an optional automatic install.
- [ ] `nova remove` offers to delete the generated files it tracked.

### New plugins

- Auth: Auth.js, Clerk.
- Payments: Stripe, Lemon Squeezy (on top of the existing `payments` plugin).
- Background jobs: Inngest, Trigger.dev, BullMQ.
- Analytics: PostHog, Plausible.
- Observability: OpenTelemetry.
- Rate limiting (Upstash) and feature flags.
- Search: Meilisearch, Algolia.
- Email: Resend.
- Tooling: Biome as an ESLint/Prettier alternative; a real shadcn CLI integration.

### Third-party plugins

- [ ] Load community plugins from npm (`nova-plugin-*`) through the existing `definePlugin` API and plugin SDK.
- [ ] Publish a plugin authoring guide and starter template.

---

## Later

- Turborepo / monorepo layout.
- Netlify, Fly.io, and Kubernetes (Helm) deployment targets.
- Mobile: Expo Router and NativeWind in the React Native template, and `nova add` support for mobile projects.
- Shell completion and "did you mean…" suggestions for unknown plugins.
- The existing long-range ideas in the README (micro-frontends, LangChain / LangGraph orchestration, multi-tenant SaaS).

---

## Website (`nova-website`)

These can ship independently of CLI releases.

- [ ] Read the version from the latest GitHub release instead of hard-coding it (the hero and OG image currently say v0.2.5 while the CLI is at v0.2.4).
- [ ] Hide GitHub stats when the API call fails, instead of showing zeros.
- [ ] Generate the plugin docs from the CLI's plugin registry so they can't drift.
- [ ] Replace the `create-next-app` boilerplate README.
- [ ] Add CI (lint, typecheck, build).

---

## 1.0 criteria

Nova reaches 1.0 when:

1. The generated-app CI matrix is green on Windows and Linux for every supported template, UI library, and package manager.
2. Every plugin is a single native manifest; there are no legacy adapters.
3. `nova create` and `nova add` produce identical output for the same selection.
4. `nova upgrade` can apply template updates without overwriting user edits.
5. The plugin API is documented and versioned, with a deprecation policy.
