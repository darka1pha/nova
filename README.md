# Nova

[![npm version](https://img.shields.io/npm/v/@darkalpha/nova.svg)](https://www.npmjs.com/package/@darkalpha/nova)
[![npm downloads](https://img.shields.io/npm/dm/@darkalpha/nova.svg)](https://www.npmjs.com/package/@darkalpha/nova)
[![node](https://img.shields.io/node/v/@darkalpha/nova.svg)](https://www.npmjs.com/package/@darkalpha/nova)
[![license](https://img.shields.io/npm/l/@darkalpha/nova.svg)](https://github.com/darka1pha/nova/blob/main/LICENSE)

**Nova** is an extensible Next.js development toolkit and CLI for creating, generating, managing, and maintaining production-ready applications.

Run one command, answer a few prompts, and get a fully configured Next.js application with a modern architecture, authentication, internationalization, forms, validation, API infrastructure, testing, UI frameworks, CMS integrations, and optional plugins — instead of starting from an empty App Router project and re-inventing the same infrastructure on every new codebase.

```bash
npx @darkalpha/nova my-app
```

Or install Nova globally:

```bash
npm install -g @darkalpha/nova
```

Then use the `nova` command:

```bash
nova my-app
```

Already have a project and just want to bolt on a feature later? Nova can do that too:

```bash
cd my-app
nova add prisma redis
```

Not sure what a plugin actually adds before you commit to it? Ask the CLI directly:

```bash
nova plugins prisma
```

---

## Table of Contents

- [Install](#install)
- [Quick Start](#quick-start)
- [Why Nova?](#why-nova)
- [Features](#features)
- [Creating a Project](#creating-a-project)
- [CLI Usage](#cli-usage)
- [Architecture Presets & Templates](#architecture-presets--templates)
- [AI & LLM Ecosystem](#ai--llm-ecosystem)
- [Plugin Registry & Discovery](#plugin-registry--discovery)
- [Plugin Development SDK](#plugin-development-sdk)
- [Environment Management (`nova env`)](#environment-management-nova-env)
- [Project Maintenance](#project-maintenance)
- [Adding Features to an Existing Project (`nova add`)](#adding-features-to-an-existing-project-nova-add)
- [What's Included](#whats-included)
- [Plugins and Add-ons](#plugins-and-add-ons)
- [UI Frameworks](#ui-frameworks)
- [Project Architecture](#project-architecture)
- [Repository Structure](#repository-structure)
- [Generator Internals](#generator-internals)
- [Add-on Architecture](#add-on-architecture)
- [Example Configurations](#example-configurations)
- [Documentation Generated With Your Project](#documentation-generated-with-your-project)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [FAQ](#faq)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Testing the Generator](#testing-the-generator)
- [Adding a New Plugin](#adding-a-new-plugin)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Changelog](#changelog)
- [Links](#links)
- [License](#license)

---

## Install

Use it directly with `npx` — no install required:

```bash
npx @darkalpha/nova my-app
```

Or install Nova globally:

```bash
npm install -g @darkalpha/nova
```

Then use the `nova` command:

```bash
nova my-app
```

**Requirements:** Node.js `>=18.18.0`, and one of npm, pnpm, yarn, or bun installed on your machine (you choose which one Nova uses per-project during setup).

---

## Quick Start

```bash
# Scaffold a new app
npx @darkalpha/nova my-app

cd my-app
cp .env.example .env

npm install   # only needed if you skipped install during setup
npm run dev
```

Open `http://localhost:3000` — your app is running with locale-aware routing (`/en`, `/fa`), a working auth reference implementation with token rotation, and a typed API layer ready to point at your backend via `API_BASE_URL`.

You can also run Nova with no arguments for a fully interactive setup:

```bash
nova
```

Nova will prompt you for the project name, package manager, UI library, and any optional add-ons before generating anything — and will refuse to generate a plugin combination it knows is invalid (see [Plugins and Add-ons](#plugins-and-add-ons)) before writing a single file.

Later, if you decide you need another feature, run `nova add` from inside the project instead of regenerating it — see [Adding Features to an Existing Project](#adding-features-to-an-existing-project-nova-add). If you're not sure what a plugin does first, run `nova plugins <name>` — see [Inspecting Plugins](#inspecting-plugins-nova-plugins).

---

## Why Nova?

Most Next.js starters provide a basic application and leave important architectural decisions to the developer: How should auth token refresh work? Where do validation schemas live? How is the API client structured? Should translations be typed? Nova answers these questions up front so you don't have to relitigate them on every new project.

### Batteries Included

Start with a complete architecture instead of an empty App Router project. Depending on your configuration, Nova can provide:

- Authentication
- Token refresh and rotation
- Internationalization
- Form validation
- API infrastructure
- Database access
- Data fetching
- State management
- Testing
- Observability
- Security
- Docker support

### Composable Plugins

Nova is designed around a plugin and add-on architecture.

Choose only the features your project needs.

For example:

```text
Next.js
  +
shadcn/ui
  +
Prisma
  +
Better Auth
  +
Redis
  +
Strapi
  +
TanStack Query
```

Or keep your application minimal:

```text
Next.js
  +
shadcn/ui
  +
TypeScript
```

And if you didn't pick everything up front, `nova add` lets you layer plugins onto an existing project whenever the need comes up.

### Swappable Technologies

Nova is designed to avoid unnecessary vendor lock-in.

You can choose between multiple technologies for different parts of your application.

Examples include:

- shadcn/ui
- Material UI
- Chakra UI
- Ant Design
- Mantine
- HeroUI
- DaisyUI
- Headless UI

And:

- Prisma or Drizzle (mutually exclusive — pick one)
- Redis
- Strapi
- OpenAPI
- TanStack Query
- Zustand
- React Hook Form
- Zod

### Documented Architecture

Generated projects include documentation explaining the architecture and important design decisions.

Documentation may include:

```text
docs/
├── folder-structure.md
├── authentication.md
├── api-layer.md
├── forms.md
├── adding-a-feature.md
├── nova-add-command.md
└── ...
```

Major modules also ship their own local `README.md` (for example `src/lib/api/`, `src/lib/auth/`, `src/features/auth/`, `src/i18n/`) so the reasoning behind non-obvious decisions travels with the code itself, not just in a top-level doc nobody re-reads six months later.

### Not a black box

Everything Nova generates is plain, ordinary Next.js/React/TypeScript code that you own outright the moment it's written to disk. There's no runtime dependency on the `nova` package inside your generated app, no telemetry, and no CLI daemon watching your project. If you want to rip out a feature, delete the files and the corresponding dependency — that's it.

### Predictable, validated generation

Nova's own generator (not the apps it produces) is built to fail safely and predictably:

- Plugin selections are **validated before any file is written**, using declared metadata about what conflicts with what and what requires what.
- Every generation runs as a planned sequence of operations; if something fails partway through, Nova **rolls back** the partially-created project directory instead of leaving a broken half-generated app on disk.
- Every feature's `package.json` footprint (dependencies, devDependencies, scripts) is declared **exactly once** and consumed by both full generation and `nova add`, so the two paths can never quietly disagree about what a plugin installs.

See [Generator Internals](#generator-internals) for details.

---

## Features

Nova provides a flexible foundation for building modern Next.js applications.

- Next.js App Router
- React and TypeScript
- Feature-first architecture
- Internationalization with RTL support
- Authentication and token rotation
- Better Auth integration
- React Hook Form and Zod
- Type-safe API infrastructure
- Multiple UI frameworks
- Headless CMS integrations
- Database integrations (Prisma or Drizzle)
- Data fetching and state management
- Testing tools
- Storybook
- Docker and Docker Compose
- PWA support
- Email and local SMTP development
- Rich text editing
- Animations
- Charts and data visualization
- Observability and error tracking
- Security features
- Health and readiness endpoints
- Extensible plugin architecture with declared metadata and validation
- Incremental feature addition to existing projects (`nova add`)
- Plugin introspection from the CLI (`nova plugins`)

---

## Creating a Project

When creating a project, Nova guides you through the setup process.

You can configure:

1. Project name
2. Package manager
3. UI framework
4. Optional plugins and add-ons
5. Dependency installation
6. Git initialization

Before any files are written, Nova validates your plugin selection against each plugin's declared constraints (requires/conflicts/supported UI libraries) — for example, Prisma and Drizzle cannot both be enabled, since they'd both try to own `DATABASE_URL`-backed schema and migrations. If something's incompatible, you'll get a clear error instead of a partially broken project.

After generation:

```bash
cd my-app
```

Create your environment file:

```bash
cp .env.example .env
```

Install dependencies if you skipped installation during setup:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Your application is now ready for development.

---

## CLI Usage

Nova supports complete project generation, architecture presets, templates, plugin development SDK, registry discovery, environment management, and lifecycle maintenance.

```text
nova [create] [project-name] [--preset <preset>] [--template <template>] [--ui <ui>] [--pm <pm>] [-y]
nova search <query>
nova plugins [subcommand|feature] [options]
nova plugin <create|validate|test|build|info> [options]
nova template <list|info|presets> [options]
nova presets
nova env [check|example] [options]
nova add <feature...> [options]
nova remove <plugin...> [--path <dir>] [--force] [--dry-run]
nova init | info | doctor | validate | clean | diff [--path <dir>] [options]
nova status [--path <dir>] [--json]
nova upgrade [--path <dir>] [--dry-run] [plugin...]
nova repair [--path <dir>] [--dry-run]
nova deploy [provider] [--path <dir>] [--force] [--dry-run] [--list]
```

### Options

```text
-h, --help               Show this help message
-v, --version            Print the installed version
-t, --template <name>    Template: default, saas, ai, dashboard, api, react-native
--preset <name>          Architecture preset: fullstack, saas, ai, dashboard, api
--ui <library>           UI Library: shadcn, mui, chakra, ant, mantine, hero, daisy, headless
--pm, --package-manager  Package manager: pnpm, npm, yarn, bun
-y, --yes                Non-interactive mode (apply defaults)
```

### Common options

```text
--path, -p <dir>   Target project directory (default: current directory)
--force, -f        Overwrite files that already exist instead of skipping them
--dry-run          Preview planned changes without writing or modifying files
--json             Print structured JSON output for scriptability and CI pipelines
--fix              Automatically repair deterministic configuration and environment drift
```

### Examples

```bash
# Project generation
nova my-app
nova my-mobile-app --template react-native

# Incremental plugin lifecycle with validation & dry-run
nova add drizzle redis
nova add trpc --dry-run
nova remove drizzle --dry-run --path ./my-app

# Plugin introspection & dependency graphs
nova plugins
nova plugins drizzle
nova plugins search auth
nova plugins tree trpc
nova plugins conflicts drizzle

# Project maintenance & auto-repair
nova info --path ./my-app
nova status --path ./my-app --json
nova doctor --path ./my-app --fix
nova diff --path ./my-app
nova upgrade --path ./my-app --dry-run
nova repair --path ./my-app
nova clean --path ./my-app --dry-run
```

---

## Project State Model & Manifest (`.nova/project.json`)

Nova stores its authoritative project state under `.nova/project.json` (and keeps `.nova.json` in sync for full backward compatibility). The state model tracks:

- `schemaVersion` (Current: `1`) — enables automated migrations when Nova's state model evolves
- `novaVersion` — records the Nova CLI version that created or last upgraded the project
- `packageManager` & `uiLibrary` & `projectType`
- `plugins` — list of actively tracked plugins
- `pluginVersions` — precise version tracking for each installed plugin
- `customMetadata` — arbitrary developer-defined metadata strictly preserved across operations

```json
{
  "$schema": "https://nova.dev/schema/project.json",
  "version": 1,
  "schemaVersion": 1,
  "name": "my-app",
  "novaVersion": "0.1.8",
  "createdAt": "2026-08-10T00:00:00.000Z",
  "updatedAt": "2026-08-10T00:00:00.000Z",
  "packageManager": "pnpm",
  "uiLibrary": "shadcn",
  "projectType": "nextjs",
  "plugins": ["drizzle", "redis", "trpc"],
  "pluginVersions": {
    "drizzle": "1.0.0",
    "redis": "1.0.0",
    "trpc": "1.0.0"
  }
}
```

## Package Management

### Package Version Resolution

Nova resolves package versions dynamically from the npm registry to ensure your projects always get the latest compatible versions.

#### Resolution Strategies

| Strategy | Description | Example |
|----------|-------------|--------|
| `compatible` (default) | Newest version satisfying the declared semver range | `^15.1.0` → resolves to `15.3.2` |
| `latest` | Newest stable published version | Resolves to whatever `dist-tags.latest` is |
| `exact` | Validates that exactly the requested version exists | `1.2.3` → must exist on registry |

#### Offline Behavior

When the npm registry is unreachable (no internet, CI without network access), Nova falls back to the static versions declared in `FEATURE_CONTRIBUTIONS` with a warning. Projects can always be generated, even offline.

#### `nova packages`

Inspect Nova-managed package versions:

```bash
nova packages              # Show all managed packages
nova packages --outdated   # Show only outdated packages  
nova packages --json       # Machine-readable JSON output
```

#### Enhanced `nova upgrade`

`nova upgrade` now resolves latest compatible versions from the registry:

- Only applies safe updates within the same major version
- Flags incompatible major version changes as warnings
- Supports `--dry-run` to preview changes without modifying files

---

## Project Maintenance

| Command | Purpose |
| --- | --- |
| `nova status` | Show project identity, structure, active plugins, and health summary. |
| `nova doctor [--fix]` | Comprehensive environment (Node, PM, OS), lockfile, dependencies, configuration, and plugin health diagnostics with transactional auto-repair. |
| `nova validate` | Run plugin validations against current project state. |
| `nova info` | Detailed project architecture, App/Pages router layout, cloud deployment statuses, available scripts, and plugin capabilities. |
| `nova list [--installed]` | List available plugins or only plugins tracked in the active project. |
| `nova remove <plugin...>` | Safely uninstalls plugin metadata, package dependencies, and scripts without deleting user-modified code. |
| `nova upgrade [--dry-run]` | Reconcile tracked plugin dependency declarations and scripts with current manifests without clobbering user source files. |
| `nova repair [--dry-run]` | Auto-repair deterministic metadata, `.env.example` contributions, missing scripts, and `.gitignore` hygiene. |
| `nova diff [plugin]` | Report categorized drift (`[SAFE TO REPAIR]`, `[MANUAL REVIEW REQUIRED]`, `[INFORMATIONAL]`). |
| `nova clean [--dry-run]` | Remove build artifacts and caches (`.next`, `.turbo`, `node_modules/.cache`, `.nova/cache`, `dist`). |

---

## Adding Features to an Existing Project (`nova add`)

`nova add` performs safe, transactional feature additions into existing projects.

### Guarantees

1. **Validate Before Write**: Checks requested plugins against already-installed plugins (e.g. rejecting Drizzle if Prisma is already active) before modifying anything.
2. **Atomic Rollback**: If an error occurs during file generation, template rendering, config patching, or script merging, all mutations are automatically rolled back.
3. **Dry-Run Preview**: Pass `--dry-run` to preview all planned file additions, modifications, package.json dependencies, and manifest changes.

### Options

| Flag | Description |
| --- | --- |
| `--path`, `-p <dir>` | Target project directory (default: current directory) |
| `--force`, `-f` | Overwrite files that already exist instead of skipping them |
| `--dry-run` | Preview planned operations without touching any file |
| `--yes`, `-y` | Skip interactive plugin follow-up prompts (use defaults) |
| `--json` | Print machine-readable JSON output |

### Examples

```bash
# Run from inside the project
cd my-app
nova add prisma redis

# Or target another directory
nova add tanstack-query --path ./my-app

# Re-copy files even if they already exist
nova add sentry --force
```

Feature names accept either the camelCase key (`tanstackQuery`) or the kebab-case addon folder name (`tanstack-query`) — both resolve to the same feature.

### What it does

1. Reads the target's `package.json` (the directory must already be a Node/Next.js project — `nova add` never creates a project itself).
2. Detects whether the project keeps its code under `src/` or at the project root, and copies each addon's files accordingly — any file the addon authors under `src/...` is copied without the `src/` prefix when the target project has no `src/` directory.
3. Creates whatever intermediate folders are needed (`lib/redis`, `lib/db`, `emails/`, `.storybook/`, etc.) — nothing needs to exist beforehand.
4. Merges the addon's `dependencies` / `devDependencies` into `package.json` (a newer pinned version wins), and adds any new `scripts` entries **without overwriting** a script you've already customized. These additions come from a single shared source (`src/featureContributions.ts`) — the exact same data full generation uses, so a feature installs identically whether you selected it up front or added it later.
5. Skips files that already exist in the project, so re-running `nova add` is safe — pass `--force` if you deliberately want the shipped template version back.
6. Validates the requested selection against declared plugin constraints (`requires`/`conflicts`) **before writing anything** — e.g. `nova add drizzle` fails fast with an actionable error if Prisma was already requested in the same command.

Plugin lifecycle hooks and any plugin-declared templates, patches, environment variables, and documentation run as part of `nova add`. Successful additions are recorded in `.nova.json` for safe later maintenance.

### Known limitations

- Switching UI libraries (`mui`, `chakra`, `ant`, ...) isn't supported via `nova add` — that requires rewriting the app's provider tree, which is only handled during initial generation.
- Config-file wiring that the generator applies automatically at scaffold time (e.g. `output: "standalone"` in `next.config.mjs` for Docker, or wrapping `next.config.mjs` for Sentry/PWA/Bundle Analyzer) is **not** re-applied by `nova add`. Files are copied and dependencies are added, but you may need to wire a couple of lines into `next.config.mjs` by hand — check that feature's `docs/*.md` in the generated project for the exact snippet.
- Conflict detection for `nova add` currently only checks the features requested **in that single command** against each other — it does not yet cross-reference plugins already installed in the target project (tracked in `.nova.json`) before writing files. Running `nova add drizzle` against a project that already has Prisma installed will not be automatically blocked; check `nova info`/`nova plugins` for existing plugins before adding a conflicting one.
- Run your package manager's install command afterwards; `nova add` only updates `package.json`, it doesn't install anything.

Full reference: `docs/nova-add-command.md` inside any generated project.

---

## Architecture Presets & Templates

Nova offers full-stack architectural presets and specialized starter templates to generate complete, ready-to-run systems in seconds:

```bash
# Create using an official preset
nova create my-saas --preset saas
nova create my-ai-app --preset ai
nova create my-dashboard --preset dashboard

# Create using a starter template
nova create my-api-service --template api
```

### Official Presets (`nova presets`)

| Preset | Description | Included Plugins |
| :--- | :--- | :--- |
| **`fullstack`** | Fullstack Next.js production stack | `drizzle`, `betterAuth`, `trpc`, `tanstackQuery`, `vitest`, `playwright` |
| **`saas`** | Subscription SaaS starter | `drizzle`, `betterAuth`, `tanstackQuery`, `sentry`, `reactEmail`, `dockerCompose`, `securityHeaders`, `health` |
| **`ai`** | AI/LLM streaming application | `ai`, `openai`, `tanstackQuery`, `zustand` |
| **`dashboard`** | Analytics & data visualization | `tanstackTable`, `recharts`, `tanstackQuery`, `zustand` |
| **`api`** | Microservice & typed backend | `trpc`, `openapi`, `docker`, `health` |

### Official Templates (`nova template list`)

| Template | Focus | Architecture |
| :--- | :--- | :--- |
| **`default`** | Clean Next.js | Next.js App Router, Tailwind CSS, TypeScript |
| **`saas`** | SaaS Platform | SaaS preset + shadcn UI |
| **`ai`** | Conversational AI | AI preset + Vercel AI SDK + React Chat UI |
| **`dashboard`** | Data Visualization | Dashboard preset + Data Tables & Charts |
| **`api`** | API Backend | API preset + Headless App Router |

---

## AI & LLM Ecosystem

Nova includes native first-class support for AI and LLM applications using the **Vercel AI SDK**:

- **`ai`** — Core AI streaming SDK (`ai`, `@ai-sdk/react`), streaming route handlers (`src/app/api/chat/route.ts`), and reactive chat components (`src/components/ai/chat.tsx`).
- **`openai`** — `@ai-sdk/openai` provider integration with OpenAI API key management.
- **`anthropic`** — `@ai-sdk/anthropic` provider integration for Anthropic Claude models.
- **`ollama`** — `ollama-ai-provider` for zero-cost, local LLM development.

```bash
# Add AI streaming to any existing Nova project
nova add ai openai
```

---

## Plugin Registry & Discovery

Discover and inspect plugins across built-in, verified, and community sources:

```bash
# Search for plugins by keyword or category
nova search database
nova search ai

# Search within the plugins subcommand
nova plugins search auth

# Inspect plugin dependency graph and conflicts
nova plugins tree trpc
nova plugins conflicts drizzle
```

---

## Plugin Development SDK

Nova provides an SDK and CLI commands to build, validate, test, and distribute custom plugins:

```bash
# Scaffold a new plugin workspace
nova plugin create my-custom-plugin --category authentication

# Validate plugin manifest and path safety
nova plugin validate

# Run automated lifecycle test simulation
nova plugin test

# Build plugin for distribution
nova plugin build

# Inspect any plugin's metadata and trust badge
nova plugin info @nova/plugin-prisma
```

### Plugin Trust Levels

- `✓ Official` — Built-in core plugins maintained by the Nova team.
- `★ Verified` — Verified third-party partner plugins.
- `Community` — Community ecosystem plugins.
- `Experimental` — Preview or experimental plugins.

---

## Environment Management (`nova env`)

Nova tracks environment variables declared by installed plugins and provides validation without exposing secret values:

```bash
# Check status of required and optional environment variables
nova env

# Validate required variables in CI pipelines (exits 1 if missing)
nova env check

# Synchronize .env.example with newly added plugin requirements
nova env example
```

---

## What's Included

Every generated project includes a production-oriented foundation.

### Framework

- Next.js App Router
- React
- TypeScript
- Strict TypeScript configuration

### Styling

- Tailwind CSS
- shadcn/ui-style primitives
- Optional alternative UI frameworks

### Internationalization

- next-intl
- Locale-prefixed routing
- English and Persian locales by default
- RTL-ready architecture

### Authentication

The base architecture supports:

- HTTP-only cookies
- Access and refresh tokens
- Refresh token rotation
- Concurrent refresh request coalescing

Better Auth can also be selected as an alternative authentication solution.

### Forms

- React Hook Form
- Zod
- Shared validation schemas
- Client and server validation

### API Layer

Generated applications can include typed API clients with:

- Retries
- Timeouts
- Interceptors
- Authentication handling
- Automatic token refresh

### Theming

- Light mode
- Dark mode
- System theme
- next-themes

---

## Plugins and Add-ons

Nova's plugin ecosystem is designed to be composable.

The available options depend on the version of Nova you are using. Every plugin listed below can be selected either during initial generation, or added afterward with `nova add` (see [Adding Features to an Existing Project](#adding-features-to-an-existing-project-nova-add)), and inspected at any time with `nova plugins` (see [Inspecting Plugins](#inspecting-plugins-nova-plugins)).

## Data and Backend

- Prisma ORM
- Drizzle ORM
- Supabase
- Better Auth
- Redis
- Strapi CMS
- OpenAPI typed client

## APIs, Data Fetching and State

- tRPC (end-to-end type safety)
- GraphQL (Yoga + Codegen + typed client)
- TanStack Query
- TanStack Table
- Zustand
- MSW API mocking

## Testing

- Vitest
- Playwright
- Cypress
- Storybook

## Content and Communication

- React Email
- Mailpit
- Tiptap rich text editor

## Infrastructure, Deployment and Operations

- Docker & Docker Compose
- Cloud Deployment (Vercel, Cloudflare, Railway, Render, AWS, Docker)
- Husky
- lint-staged
- PWA
- Bundle Analyzer
- Sentry
- Health and readiness endpoints
- Security headers

## Design and UX

- Design System
- Animations (Framer Motion)
- Recharts

### Plugin summary table

| Category                      | Options                                                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Data and Backend              | Prisma ORM, Drizzle ORM, Supabase, Better Auth, Redis, Strapi CMS, OpenAPI typed client                                  |
| APIs, Fetching & State        | tRPC, GraphQL (Yoga), TanStack Query, TanStack Table, Zustand, MSW API mocking                                          |
| Testing                       | Vitest, Playwright, Cypress, Storybook                                                                                  |
| Content and Communication     | React Email, Mailpit, Tiptap rich text editor                                                                           |
| Infrastructure & Deployment   | Docker, Cloud Deployment (Vercel/Cloudflare/Railway/Render/AWS), Husky + lint-staged, PWA, Bundle Analyzer, Sentry, Health |
| Design and UX                 | Design System, Animations, Recharts                                                                                     |

Each plugin is a self-contained overlay under `templates/addons/<name>`. Enabling it copies its files on top of the base template and automatically wires in the required dependencies, scripts, and environment variables — there's no manual wiring step after generation. The same addon folders back `nova add`, so a feature behaves identically whether you selected it at scaffold time or added it later.

Each plugin also carries declarative metadata (`src/generator/pluginMetadata.ts`) describing its name, description, and any `requires`/`conflicts`/`supportedUI` constraints. Nova validates your full selection against this metadata **before writing any files**, so an incompatible combination fails fast with a clear error rather than partway through generation.

### Known plugin conflicts

| Plugin A | Plugin B | Reason |
| --- | --- | --- |
| Prisma ORM (`prisma`) | Drizzle ORM (`drizzle`) | Both own `DATABASE_URL`-backed schema/migrations and would contribute colliding `db:*` scripts — pick one ORM per project. |


If you need to evaluate both, generate two separate projects (or use `nova add` against two throwaway scaffolds) rather than trying to enable both in one.

---

# UI Frameworks

Nova supports multiple UI approaches.

## shadcn/ui

The default UI approach.

Provides:

- Tailwind CSS
- Radix UI primitives
- Source-based components
- Accessible components

Select:

```text
shadcn
```

## Material UI

Provides:

- MUI components
- Theme configuration
- App Router integration
- Cache provider

Select:

```text
mui
```

## Chakra UI

Provides:

- Chakra provider
- Theme configuration
- Component examples

Select:

```text
chakra
```

## Ant Design

Provides:

- Ant Design components
- ConfigProvider
- Theme support
- Component examples

Select:

```text
ant
```

## Mantine

Provides:

- Mantine provider
- Theme configuration
- Mantine components

Select:

```text
mantine
```

## HeroUI

Provides:

- HeroUI provider
- Modern component primitives
- Theme integration

Select:

```text
hero
```

## DaisyUI

Provides:

- DaisyUI
- Tailwind integration
- Theme configuration

Select:

```text
daisy
```

## Headless UI

Provides:

- Headless UI primitives
- Tailwind integration
- Heroicons

Select:

```text
headless
```

### UI framework summary table

| Select     | Library               | Notes                                                                  |
| ---------- | --------------------- | ---------------------------------------------------------------------- |
| `shadcn`   | shadcn/ui _(default)_ | Tailwind CSS, Radix UI primitives, source-based, accessible components |
| `mui`      | Material UI           | MUI components, theme configuration, App Router cache provider         |
| `chakra`   | Chakra UI             | Chakra provider, theme configuration, component examples               |
| `ant`      | Ant Design            | Ant Design components, `ConfigProvider`, theme support                 |
| `mantine`  | Mantine               | Mantine provider, theme configuration, components                      |
| `hero`     | HeroUI                | HeroUI provider, modern component primitives                           |
| `daisy`    | DaisyUI               | Tailwind plugin, theme presets                                         |
| `headless` | Headless UI           | Headless UI primitives, Tailwind integration, Heroicons                |

**Note:** switching UI library after generation is only supported by re-generating the project — `nova add` cannot swap the provider tree for you (see [Known limitations](#adding-features-to-an-existing-project-nova-add) above).

---

# Project Architecture

Generated applications follow a feature-first architecture.

```text
src/
├── app/
│   └── [locale]/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── forms/
│   └── providers/
│
├── features/
│   ├── auth/
│   └── dashboard/
│
├── lib/
│   ├── api/
│   ├── auth/
│   ├── prisma/
│   ├── db/
│   ├── validations/
│   ├── cache/
│   └── helpers/
│
├── services/
│
├── utils/
│
├── i18n/
│
└── messages/
    ├── en/
    └── fa/
```

### Full folder layout

For reference, the complete generated `src/` tree (with every optional folder included) looks like this:

```text
src/
├── app/            # App Router routes, grouped under [locale]
├── actions/         # Cross-cutting Server Actions not tied to one feature
├── components/
│   ├── ui/           # shadcn/ui-style primitives (button, input, card...)
│   ├── common/        # Small generic UI (spinner, empty-state)
│   ├── layout/         # Header, footer, theme/locale switchers
│   ├── forms/           # Form wrapper, field, error components
│   └── providers/        # Client-side provider wrappers (theme, etc)
├── features/         # Feature-first modules (auth, dashboard, profile...)
│   └── <feature>/
│       ├── components/
│       ├── hooks/
│       ├── actions/
│       ├── schemas/
│       └── types/
├── hooks/            # App-wide reusable hooks
├── lib/
│   ├── api/            # Type-safe fetch client(s) + interceptors
│   ├── auth/            # Token rotation, session helpers
│   ├── prisma/           # Prisma client singleton (if enabled)
│   ├── db/                # Drizzle client + schema (if enabled instead of Prisma)
│   ├── validations/       # Shared zod schemas
│   ├── constants/          # App-wide constants
│   ├── helpers/             # cn() and other small helpers
│   └── cache/                # Cache tag registry
├── services/          # Business-shaped API calls, built on lib/api
├── utils/             # Pure utility functions (formatting, arrays, strings)
├── config/            # Site config, validated env
├── providers/         # Composition root for all client providers
├── styles/            # Global CSS
├── types/             # Shared TypeScript types
├── messages/           # next-intl translation JSON per locale
└── i18n/               # next-intl routing/navigation/request config
```

**Note:** if a project doesn't use a `src/` directory (e.g. `create-next-app` with the "Use `src/` directory?" prompt declined), `nova add` detects this automatically and remaps addon files to the project root instead — see [Adding Features to an Existing Project](#adding-features-to-an-existing-project-nova-add).

### Architecture Rules

**Features**

Own everything specific to a product area.

```text
features/
└── users/
    ├── components/
    ├── actions/
    ├── schemas/
    └── types/
```

**Lib**

Contains cross-cutting infrastructure.

Examples:

- API
- Authentication
- Database
- Caching
- Validation

**Components**

Contains reusable UI without business-specific logic.

**Services**

Contains business-oriented operations built on top of the API layer.

Features should call services rather than directly calling the API transport layer.

This keeps business logic independent from the underlying HTTP implementation.

**Rule of thumb**

- **`features/`** owns anything specific to one product area — start here for new work.
- **`lib/`** owns cross-cutting infrastructure (HTTP, auth, DB).
- **`components/`** owns UI with no business logic.
- **`services/`** is the only place allowed to call `lib/api` directly for business data; features call services, not `api`, so the transport can change independently.

---

# Repository Structure

The Nova repository itself is organized as follows:

```text
.
├── bin/
│   └── nova.js
│
├── src/
│   ├── index.ts
│   ├── add.ts
│   ├── prompts.ts
│   ├── generator.ts
│   ├── generator/
│   │   ├── context.ts
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   ├── hooks.ts
│   │   ├── operations.ts
│   │   ├── pluginMetadata.ts
│   │   ├── pluginInfo.ts
│   │   ├── validators.ts
│   │   ├── verifyManifestSync.ts
│   │   └── patchers/
│   │       ├── types.ts
│   │       ├── nextConfigPatcher.ts
│   │       ├── providerPatcher.ts
│   │       ├── middlewarePatcher.ts
│   │       └── index.ts
│   ├── plugin/
│   │   ├── types.ts
│   │   ├── registry.ts
│   │   ├── legacyAdapter.ts
│   │   ├── dependencyGraph.ts
│   │   ├── applyTemplates.ts
│   │   ├── applyPatches.ts
│   │   ├── applyEnv.ts
│   │   ├── applyDocs.ts
│   │   ├── runHooks.ts
│   │   ├── validate.ts
│   │   ├── prompts.ts
│   │   └── nativePlugins/
│   │       ├── prisma.ts
│   │       ├── drizzle.ts
│   │       ├── dockerCompose.ts
│   │       └── securityHeaders.ts
│   ├── addonRegistry.ts
│   ├── featureContributions.ts
│   ├── featurePackageAdditions.ts
│   ├── packageMerge.ts
│   ├── projectStructure.ts
│   ├── packageManifest.ts
│   └── types.ts
│
├── packages/
│   └── core/
│       └── src/
│           ├── fs.ts
│           ├── pmCommands.ts
│           ├── prompts.ts
│           └── logger.ts
│
├── templates/
│   ├── base/
│   ├── addons/
│   └── ui/
│
├── scripts/
│   ├── smoke-test.mjs
│   └── verify-package-manifest-sync.ts
│
└── docs/
    └── migration/
```

- **`bin/nova.js`** — the published CLI entrypoint (used by `npm start` or `npx`).
- **`src/index.ts`** — the CLI entrypoint; dispatches between the `nova [project-name]` generation flow, `nova add <feature...>`, and `nova plugins [feature]`.
- **`src/generator/index.ts`** — high-level generation orchestration: validates the plugin selection, builds an operation plan (copy base template, copy selected addons, copy UI overlay), executes it with rollback on failure, writes `package.json`, and runs the config patchers and remaining single-purpose helpers (Storybook preview, DaisyUI Tailwind patch, README, lint-staged, docker-compose).
- **`src/generator/`** — generator internals, one concern per module (see [Generator Internals](#generator-internals) below).
- **`src/plugin/`** — the native plugin engine (`PluginManifest`, registry, dependency graph, template/patch/env/doc application, lifecycle hooks). New plugins with richer contributions (self-declared env vars, docs, patches, prompts) are authored here under `nativePlugins/`, e.g. `drizzle.ts`.
- **`src/add.ts`** — the `nova add` implementation: copies addon files into an existing project (with `src/`-prefix remapping) and merges dependencies/scripts into its `package.json`, running the same plugin engine (dependency graph, validation, templates, patches, env, docs) full generation uses.
- **`src/addonRegistry.ts`** — single source of truth mapping each `FeatureKey` to its addon folder name, shared by `generator/index.ts`, `add.ts`, and `pluginInfo.ts`.
- **`src/featureContributions.ts`** — single source of truth for what each feature contributes to `package.json` (dependencies/devDependencies/scripts), consumed by full generation, `nova add`, and `nova plugins`.
- **`src/featurePackageAdditions.ts`** — thin backward-compatible re-export of `featureContributions.ts` for any code still importing the old name.
- **`src/packageMerge.ts`** — merges an addon's dependency/script additions into an existing project's `package.json` without clobbering scripts you've already customized.
- **`src/projectStructure.ts`** — detects whether a target project uses a `src/` directory and remaps addon file paths accordingly for `nova add`.
- **`src/prompts.ts`** — the interactive `@clack/prompts`-based CLI flow, shared between initial generation and the `nova add` feature multiselect.
- **`src/packageManifest.ts`** — builds a brand-new generated project's `package.json` (scripts + dependencies) from the selected feature set and `featureContributions.ts`.
- **`packages/core/`** — `@nova/core`, a framework-agnostic workspace package with zero feature-specific logic: template/filesystem copying, package-manager command resolution, prompt cancel-handling, and logging. Built once and bundled into the CLI at publish time.
- **`templates/base/`** — the complete base Next.js App Router project that every generated app starts from.
- **`templates/addons/`** — one folder per optional feature; each overlays files on top of `templates/base` when enabled, and is reused verbatim by `nova add`.
- **`templates/ui/`** — one folder per alternative UI library, overlaid last so provider wiring and examples land correctly.
- **`scripts/verify-package-manifest-sync.ts`** — regression guard confirming `packageManifest.ts`'s output for every feature matches `featureContributions.ts`; runs in CI and `prepublishOnly`.

---

## Generator Internals

Nova's own generator (as distinct from the apps it produces) went through a Phase 1 hardening pass focused on making it robust, predictable, and easy to extend as more plugins are added. The pieces:

| Module                                | Responsibility                                                                                                                                                                                                                                                                                     |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/generator/context.ts`            | Builds a single, frozen `GeneratorContext` (paths, resolved UI library, logger, dry-run flag) threaded through generation instead of recomputing values or relying on mutable module state.                                                                                                        |
| `src/generator/logger.ts`             | A small structured logger (`debug`/`verbose`/`info`/`success`/`warn`/`error`/`step`) with a CI-aware minimum log level, replacing scattered `console.log` calls.                                                                                                                                   |
| `src/generator/errors.ts`             | Typed error classes (`InvalidProjectNameError`, `DirectoryNotEmptyError`, `PluginConflictError`, `MissingPluginDependencyError`, `OperationExecutionError`, ...) so failures are identifiable and carry actionable messages instead of generic `Error`s.                                           |
| `src/generator/pluginMetadata.ts`     | Declarative per-plugin metadata: name, description, `requires`, `conflicts`, `supportedUI`. The single place new cross-plugin constraints get declared.                                                                                                                                            |
| `src/generator/validators.ts`         | `validatePluginSelection()` checks a feature selection against `pluginMetadata.ts` **before any files are written**.                                                                                                                                                                               |
| `src/generator/pluginInfo.ts`         | Joins `addonRegistry.ts`, `pluginMetadata.ts`, and `featureContributions.ts` into one queryable view per plugin; powers `nova plugins`.                                                                                                                                                            |
| `src/generator/operations.ts`         | Represents file operations (`mkdir`, `copyDir`, `writeFile`, `writeJson`) as plain data (an `OperationPlan`) rather than closures, executed sequentially by `executePlan()`. On failure, `rollbackTargetDir()` removes the partially-generated project directory instead of leaving it half-built. |
| `src/generator/hooks.ts`              | A minimal `HookRegistry` supporting `beforeGenerate` / `afterGenerate` / `beforePlugin` / `afterPlugin` lifecycle hooks, so future commands can observe generation without editing generator internals.                                                                                            |
| `src/generator/patchers/*.ts`         | Config patching for `next.config.mjs`, the provider tree (`app-providers.tsx`), and `middleware.ts`, expressed as ordered, declarative **contribution lists** (feature flag → transform) instead of inline `if` chains in `generator.ts`.                                                          |
| `src/generator/verifyManifestSync.ts` | Regression guard confirming `buildPackageJson()`'s output matches `featureContributions.ts` per feature — exercised by `npm run verify:manifest-sync`.                                                                                                                                             |
| `src/plugin/*`                        | The richer, self-describing plugin engine: `PluginManifest` (`templates`/`patches`/`env`/`docs`/`prompts`/`hooks`), `PluginRegistry`, `resolveDependencyGraph()` (requires/conflicts/cycles), and applier modules invoked by both full generation and `nova add`. New plugins with non-trivial contributions (like Drizzle's `env` entry) are authored here.                                     |

**Design principles carried through all of the above:**

- **Single source of truth per concern.** A feature's package.json footprint lives in exactly one place (`featureContributions.ts`); a plugin's cross-plugin constraints live in exactly one place (`pluginMetadata.ts`); config patches live in exactly one place per target file (`patchers/*.ts`).
- **Validate before writing.** Plugin selection is checked against declared constraints before the target directory is even created.
- **Plan, then execute.** File operations are built as a data structure first and executed second, which is what makes rollback-on-failure possible and will make a future `--dry-run` flag a small addition rather than a rewrite.
- **No behavior change for existing users.** Every refactor in this pass preserves byte-identical generated output for every existing feature/UI combination — verified against `scripts/smoke-test.mjs`.

This foundation is what a future `nova doctor`, `nova upgrade`, or `nova remove` command would build on: `pluginInfo.ts` already answers "what does this plugin touch," `pluginMetadata.ts` already answers "what does this plugin require or conflict with," and the hook registry already gives a place to add cross-cutting behavior without touching `generator.ts` again.

---

# Add-on Architecture

Nova uses an overlay-based add-on architecture.

Each add-on lives under:

```text
templates/addons/<name>
```

When an add-on is enabled, its files are applied on top of the base template.

For example:

```text
templates/
├── base/
│
└── addons/
    ├── prisma/
    ├── drizzle/
    ├── redis/
    ├── strapi/
    ├── sentry/
    └── playwright/
```

This allows features to be composed without requiring complex template generation logic.

Add-on files can intentionally override base files when required.

Examples include:

- `middleware.ts`
- `next.config.mjs`
- `app-providers.tsx`

The goal is to keep each plugin isolated, explicit, and easy to maintain. There is no deep merge logic for file overlays — an overlay file simply replaces the base file at the same path, so it's always obvious, by reading the addon folder, exactly what it changes. (Config _patching_ — as opposed to file overlaying — is handled separately and declaratively; see [Generator Internals](#generator-internals).)

UI library overlays (`templates/ui/*`) are applied last, after all selected addons, so provider wiring (e.g. wrapping `<AppProviders>` with `<MuiProvider>` or `<ChakraAppProvider>`) is consistent regardless of which other addons were selected.

The exact same `templates/addons/<name>` folders power `nova add`: when adding a feature to an existing project, Nova copies the same files, only remapping the `src/` prefix if the target project doesn't use a `src/` directory. The one thing `nova add` does **not** replay is the config-patching step (`next.config.mjs`, `middleware.ts`, provider-tree wiring) that `generateProject` performs automatically via `src/generator/patchers/*.ts` for legacy contributions — plugins migrated to the native `src/plugin/` engine (like Drizzle's `env` contribution, or Security Headers' `patches`) **do** replay through `nova add`, since `applyPluginPatches`/`appendPluginEnvContributions`/`writePluginDocs`/`applyPluginTemplates` are shared by both `generateProject` and `addFeaturesToProject`.

---

## Example Configurations

**Minimal marketing or landing site**

```text
UI:      shadcn
Plugins: (none)
```

**SaaS app with a Postgres backend (Prisma)**

```text
UI:      shadcn
Plugins: Prisma, Better Auth, TanStack Query, Sentry, Docker
```

**SaaS app with a Postgres backend (Drizzle)**

```text
UI:      shadcn
Plugins: Drizzle, Better Auth, TanStack Query, Sentry, Docker
```

**Content-driven site backed by a headless CMS**

```text
UI:      mantine
Plugins: Strapi CMS, React Email, Mailpit
```

**Internal dashboard or admin tool**

```text
UI:      mui
Plugins: TanStack Query, TanStack Table, Recharts, Zustand
```

**Fully-loaded reference build** (mirrors the CLI's own smoke test)

```text
UI:      mui
Plugins: Prisma, Better Auth, TanStack Query, Cypress, Vitest, Storybook,
         Docker, Husky, PWA, Bundle Analyzer, Zustand, MSW, React Email,
         Playwright, Sentry, OpenAPI
```

**Started minimal, grew into a SaaS app** (using `nova add`)

```bash
nova my-app                     # UI: shadcn, no plugins
cd my-app
nova add drizzle betterAuth     # add DB + auth later
nova add tanstackQuery sentry   # add data fetching + monitoring later
```

**Not sure what a plugin does before adding it**

```bash
nova plugins prisma
nova plugins drizzle
nova add prisma sentry
```

---

## Documentation Generated With Your Project

Every scaffolded app ships with its own `docs/` folder so the architecture is explained in place, not just in this README:

```text
docs/
├── folder-structure.md
├── authentication.md
├── api-layer.md
├── forms.md
├── validation.md
├── server-actions.md
├── internationalization.md
├── environment-variables.md
├── deployment.md
├── adding-a-feature.md
├── nova-add-command.md
├── drizzle.md            (if Drizzle is selected)
└── ...
```

Plus module-local `README.md` files inside `src/lib/api/`, `src/lib/auth/`, `src/lib/db/` (if Drizzle is selected), `src/features/auth/`, and `src/i18n/` explaining the reasoning behind non-obvious implementation choices — for example why token refresh coalesces concurrent requests, or why the root `layout.tsx` is intentionally minimal.

`docs/nova-add-command.md` specifically documents the `nova add` workflow from inside a generated project — usage, options, what it does under the hood, and its known limitations — so the reasoning travels with the code even if this README changes later.

---

## Environment Variables

Generated projects include a `.env.example` covering every variable the scaffold understands, grouped by category:

- **App** — public URL/name, safe to expose via `NEXT_PUBLIC_*`
- **Database** — `DATABASE_URL`, used by Prisma or Drizzle, whichever is enabled
- **Authentication** — token secrets/TTLs for the custom rotation system, or Better Auth secrets if that module is enabled
- **External APIs** — base URL/timeout for `src/lib/api`
- **Sentry** — DSNs and trace sample rates, when Sentry is enabled

`.env` itself is never committed — only `.env.example` is tracked in generated projects. When you add a new environment variable, add it to both `.env` and `.env.example` together, and to `src/config/env.ts` if the app should fail fast at boot when it's missing.

When a plugin is added later via `nova add`, remember to also copy over any new variables its `docs/*.md` mentions — for plugins on the native `src/plugin/` engine (e.g. Drizzle), `nova add` appends any missing keys to `.env.example` automatically via `appendPluginEnvContributions`; for legacy addons this may still require a manual copy.

---

## Deployment

## Deployment

Nova provides first-class cloud deployment support through the `nova deploy` command, generating tailored configurations, automated CI/CD workflows, Dockerfiles, and production guides:

```bash
# List supported cloud providers
nova deploy --list

# Configure deployment for your target cloud provider
nova deploy vercel
nova deploy cloudflare
nova deploy railway
nova deploy render
nova deploy aws
nova deploy docker
```

### Supported Deployment Providers

- **Vercel**: Generates `vercel.json` with Edge headers and `.github/workflows/deploy-vercel.yml` for automated preview and production deployments.
- **Cloudflare Pages & Workers**: Generates `wrangler.toml` (with `nodejs_compat`) and `.github/workflows/deploy-cloudflare.yml`.
- **Railway**: Generates `railway.json` with Nixpacks build config, healthcheck paths, and PostgreSQL/Redis provisioning guides.
- **Render**: Generates `render.yaml` Infrastructure-as-Code blueprints for zero-configuration web service deployment.
- **AWS**: Generates `apprunner.yaml` and `.github/workflows/deploy-aws.yml` for automated Docker builds and Amazon ECR pushes.
- **Docker & Self-Hosted**: Generates a production multi-stage `Dockerfile.prod`, `docker-compose.prod.yml`, and reverse proxy guides in `docs/deployment/self-hosted.md`.

Every variable in `.env.example` must be set in production — missing required variables fail fast at boot if you're using the generated `src/config/env.ts` validation.


---

## FAQ

**Does Nova lock me into a specific backend?**
No. The generated API layer (`src/lib/api`) is a thin, typed fetch wrapper you point at any backend via `API_BASE_URL`. Nothing in the generated code assumes a specific server framework or database.

**Should I pick Prisma or Drizzle?**
Both are optional and mutually exclusive — Nova will reject a selection with both enabled. Pick Prisma if you want Prisma Studio, its generated client, and its larger example ecosystem; pick Drizzle if you want a smaller runtime, SQL-first schema definitions, and no separate client-generation step. See `nova plugins drizzle` and `nova plugins prisma`, or each plugin's `docs/*.md` in a generated project, for the full tradeoff writeup.

**Can I remove a feature after generating the project?**
Yes. Everything Nova writes is plain, readable TypeScript/React you own outright — delete the files and the corresponding dependency entries in `package.json`. There's no hidden runtime tying the app back to the `nova` CLI package. `nova remove <plugin>` automates the `package.json`/manifest side of this.

**Can I add a feature I skipped, without regenerating the whole project?**
Yes — that's exactly what `nova add <feature...>` is for. Run it from inside the project (or point it at another directory with `--path`), and it copies the addon's files and merges its dependencies/scripts into your existing `package.json`. See [Adding Features to an Existing Project](#adding-features-to-an-existing-project-nova-add).

**How do I know what a plugin will actually add before I run it?**
Run `nova plugins <feature>`. It shows the plugin's description, any `requires`/`conflicts` constraints, supported UI libraries, and a summary of its `package.json` footprint — all sourced from the same data generation itself uses.

**Does `nova add` overwrite files I've already customized?**
No, by default it skips any file that already exists at the destination. Pass `--force` if you deliberately want the shipped template version back, overwriting your local changes.

**What happens if generation fails partway through?**
Nova rolls back: since it only ever generates into a directory it just created (or confirmed was empty), a failed generation removes that directory rather than leaving a half-built project behind. This is also what happens if you request an invalid combination like `prisma` + `drizzle` — the error is raised before any file is written, so nothing is left on disk.

**Does Nova modify my project after generation, or phone home?**
No. Nova runs once, at generation time (or once per `nova add` invocation), entirely locally. There's no CLI daemon, no telemetry, and no ongoing dependency on `nova`/`@darkalpha/nova` inside the generated app.

**Can I use Nova in CI?**
Yes — pass a project name as a CLI argument and set `CI=true` in the environment; Nova will skip the interactive "install now?" confirmation, use a quieter log level, and generate non-interactively.

**Which package managers are supported?**
pnpm, npm, yarn, and bun. Whichever you choose during setup is used consistently for the generated scripts and documented install/dev commands in the project's own `README.md` — including plugin-contributed scripts like Drizzle's `db:generate`/`db:migrate`/`db:push`/`db:studio`, which call `drizzle-kit` directly rather than assuming npm.

**What if I select a UI library other than shadcn — do I still get shadcn's primitives?**
The `templates/ui/<library>` overlay is applied after the base template and after your selected addons, wiring in that library's provider and a couple of example components. shadcn-style primitives in `src/components/ui` remain in the tree unless you remove them; feel free to delete what you don't use.

**Can I switch UI libraries with `nova add`?**
No — switching UI libraries requires rewriting the provider tree, which is only handled during initial generation. `nova add` will warn you if you pass a UI library name as a feature.

**Can I add a plugin that isn't listed?**
Yes — see [Adding a New Plugin](#adding-a-new-plugin). Plugins are just overlay folders under `templates/addons/<name>` plus a feature flag, a metadata entry, and a `package.json` contribution, so adding one to a fork of Nova is a small, mechanical change, and it automatically becomes available to the initial generator, `nova add`, and `nova plugins`.

---

## Troubleshooting

**`Directory "my-app" already exists and is not empty.`**
Nova refuses to generate into a non-empty directory to avoid clobbering existing files. Pick a different project name or empty the target directory first.

**`No package.json found in "<dir>"` when running `nova add`.**
`nova add` only works inside an existing Node/Next.js project — it never scaffolds one. Run it from the project root, or pass the correct directory with `--path`.

**`nova add` says a file was skipped.**
That means the destination file already existed. This is intentional so your customizations aren't silently overwritten — pass `--force` if you want the addon's version instead.

**`nova add` warns "looks like a UI library, not a feature."**
UI library switching (`mui`, `chakra`, `ant`, `mantine`, `hero`, `daisy`, `headless`) isn't supported incrementally — see [Known limitations](#adding-features-to-an-existing-project-nova-add).

**Generation fails with a plugin conflict or missing-dependency error (e.g. Prisma + Drizzle).**
Nova validates your plugin selection against declared metadata before writing anything. Run `nova plugins <feature>` for each plugin involved to see its `requires`/`conflicts` list, then adjust your selection to include only one of the conflicting plugins.

**TypeScript can't resolve `@nova/core` while developing Nova itself.**
Run `npm install` at the repository root first — `@nova/core` is a real workspace package, and both the editor's TypeScript server and `tsc --noEmit` need the workspace symlink (or the `paths` mapping in `tsconfig.json`) to resolve it.

**Git init or dependency install fails after generation.**
Nova continues even if `git init`/`git commit` or the install step fails, and prints a warning with the exact command to run manually (e.g. `pnpm install`) inside the generated project directory.

---

## Development

Clone the repository and install dependencies:

```bash
npm install
```

Run the CLI in development mode:

```bash
npm run dev
```

Build the project:

```bash
npm run build
```

Run type checking:

```bash
npm run typecheck
```

Verify the package manifest data hasn't drifted:

```bash
npm run verify:manifest-sync
```

Run the compiled CLI:

```bash
npm start
```

If the project uses the `@nova/core` workspace package, run `npm install` from the repository root before running development, build, or type-check commands.

---

# Testing the Generator

Nova includes end-to-end smoke tests for generated projects, plus a dedicated regression guard for package manifest data.

Run the smoke tests:

```bash
node scripts/smoke-test.mjs
```

The smoke tests generate multiple project configurations and verify that the expected files are created.

Test scenarios may include:

- Default configuration
- Full feature configuration
- Different UI frameworks
- Infrastructure plugins
- Redis
- Mailpit
- Health checks
- Security headers
- Docker Compose
- Drizzle ORM (files, scripts, dependencies, `.nova.json` tracking)
- The Prisma/Drizzle conflict, asserting generation fails and leaves no partial project directory on disk

Run the manifest sync check:

```bash
npm run verify:manifest-sync
```

This confirms `buildPackageJson()`'s output for every feature matches `src/featureContributions.ts` — the single source of truth both full generation and `nova add` read from. Since both paths consume the same data, this should always pass; it exists as a regression guard against a future change accidentally bypassing that shared source.

When adding or modifying a plugin, update the relevant smoke tests. If your change affects `nova add` behavior specifically (e.g. new package additions in `src/featureContributions.ts`), verify it manually against a scaffolded project until incremental-add coverage is added to the smoke suite.

---

# Adding a New Plugin

To add a new plugin:

1. Create the plugin template under:

```text
templates/addons/<plugin-name>
```

2. Add the corresponding feature key to:

```text
src/types.ts
```

3. Register the plugin's addon folder in:

```text
src/addonRegistry.ts
```

4. Add the plugin's dependencies and scripts **once**, in:

```text
src/featureContributions.ts
```

Both `src/packageManifest.ts` (full generation) and `nova add` read from this file automatically — there is nothing further to duplicate.

5. Add descriptive metadata, and any real `requires`/`conflicts`/`supportedUI` constraints, in:

```text
src/generator/pluginMetadata.ts
```

This also makes the plugin show up correctly in `nova plugins`.

6. If the plugin needs richer contributions — its own `env` variables, `docs`, config `patches`, or `prompts` — author it as a native manifest in:

```text
src/plugin/nativePlugins/<plugin-name>.ts
```

and register it in `src/plugin/nativePlugins/index.ts`'s `NATIVE_PLUGINS` array (see `drizzle.ts` for a minimal example built on top of steps 2–5). Plugins that only need a file overlay + package.json contribution don't need this step — they're picked up automatically via the legacy adapter.

7. If the plugin needs to patch `next.config.mjs`, the provider tree, or `middleware.ts` and hasn't migrated to a native manifest, add a contribution to the relevant file in:

```text
src/generator/patchers/
```

rather than adding a new `if` branch to `generator/index.ts`.

8. Add plugin-specific environment variables (to `.env.example` in the relevant template if unconditional, or via a native manifest's `env` array if plugin-specific, and document them).

9. Add documentation (a `docs/<plugin>.md` in the plugin's own addon folder, plus a mention in this README's plugin tables).

10. Add smoke tests in `scripts/smoke-test.mjs`.

11. Run `npm run verify:manifest-sync` to confirm the plugin's package.json contribution is consistent.

12. Verify that the plugin works independently, both via `nova <name>` and via `nova add <plugin-name>` against an existing project, and check `nova plugins <plugin-name>` renders sensibly.

13. Verify compatibility with related plugins.

14. Run the complete test suite (`npm run typecheck && npm run verify:manifest-sync && node scripts/smoke-test.mjs`).

Because a feature's package.json contribution now lives in exactly one file (`src/featureContributions.ts`), it's no longer possible for full generation and `nova add` to silently drift apart for a given plugin — `npm run verify:manifest-sync` exists specifically to catch a regression here.

---

## Roadmap

### Recently Delivered

- [x] **Vercel AI SDK & LLM Ecosystem** — Native plugins for Vercel AI SDK (`ai`, `openai`, `anthropic`, `ollama`), streaming route handlers, and chat UI components via `nova create --template ai` or `nova add ai`.
- [x] **Architecture Presets & Starter Templates** — Curated presets (`fullstack`, `saas`, `ai`, `dashboard`, `api`) and templates with deterministic graph conflict resolution.
- [x] **Plugin Development SDK & Registry Engine** — Complete toolkit for building, testing, validating, and discovering plugins (`nova plugin create/validate/test`, `nova search`).
- [x] **Environment Management Subsystem** — Safe variable tracking, CI validation (`nova env check`), and automated `.env.example` sync (`nova env example`).
- [x] **Drizzle ORM & Database Layer** — SQL-first schema and migration support with postgres-js, Drizzle Kit, Prisma, and Supabase.
- [x] **tRPC & GraphQL** — End-to-end type-safe APIs with tRPC and GraphQL Yoga + typed codegen.
- [x] **React Native Templates** — Expo SDK 52 mobile app scaffolding via `nova react-native` / `--template react-native`.
- [x] **Cloud Deployment System** — Modular provider-based architecture for Vercel, Cloudflare, Railway, Render, AWS, and Docker via `nova deploy`.

### Future Horizons & In Development

- **Micro-frontends & Module Federation** — Webpack Module Federation (`@module-federation/nextjs-mf`) and host/remote container orchestration for enterprise multi-app architectures.
- **LangChain & LangGraph Orchestration** — Complex agentic workflows, multi-agent systems, and LangChain integration alongside the existing Vercel AI SDK streaming stack.
- **Multi-Tenant SaaS Workspace Abstractions** — Subdomain / tenant-based routing middleware (`org.app.com` or `/org/[tenant]`), workspace membership switching context, and tenant-isolated database schemas (RLS / schema-per-tenant).


---

# Contributing

Contributions are welcome.

Before submitting changes:

```bash
npm install
npm run typecheck
npm run verify:manifest-sync
npm run build
node scripts/smoke-test.mjs
```

When contributing a new plugin or UI integration:

- Keep the plugin isolated.
- Avoid unnecessary dependencies.
- Follow the existing architecture (see [Generator Internals](#generator-internals)).
- Declare package.json contributions once, in `src/featureContributions.ts`.
- Declare plugin metadata and any real constraints in `src/generator/pluginMetadata.ts`.
- Prefer a native plugin manifest (`src/plugin/nativePlugins/`) over a new `if` branch in `generator/index.ts`.
- Update documentation.
- Add tests.
- Add smoke-test coverage.
- Document plugin conflicts and dependencies.
- Keep generated applications production-ready.
- Run `npm run verify:manifest-sync` before opening a PR that touches package.json contributions.

Prefer small, focused changes.

---

## Changelog

See [`CHANGELOG.md`](./CHANGELOG.md) for a full history of changes to Nova itself (not the projects it generates).

---

## Links

- [npm package](https://www.npmjs.com/package/@darkalpha/nova)
- [Report an issue](https://github.com/darka1pha/nova/issues)
- [Source code](https://github.com/darka1pha/nova)

---

# License

MIT