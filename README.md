# Nova

[![npm version](https://img.shields.io/npm/v/@darkalpha/nova.svg)](https://www.npmjs.com/package/@darkalpha/nova)
[![npm downloads](https://img.shields.io/npm/dm/@darkalpha/nova.svg)](https://www.npmjs.com/package/@darkalpha/nova)
[![node](https://img.shields.io/node/v/@darkalpha/nova.svg)](https://www.npmjs.com/package/@darkalpha/nova)
[![license](https://img.shields.io/npm/l/@darkalpha/nova.svg)](https://github.com/YOUR_USERNAME/nova/blob/main/LICENSE)

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

---

## Table of Contents

- [Install](#install)
- [Quick Start](#quick-start)
- [Why Nova?](#why-nova)
- [Features](#features)
- [Creating a Project](#creating-a-project)
- [CLI Usage](#cli-usage)
- [What's Included](#whats-included)
- [Plugins and Add-ons](#plugins-and-add-ons)
- [UI Frameworks](#ui-frameworks)
- [Project Architecture](#project-architecture)
- [Repository Structure](#repository-structure)
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
- [Contributing](#contributing)
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

Nova will prompt you for the project name, package manager, UI library, and any optional add-ons before generating anything.

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

- Prisma
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
└── ...
```

Major modules also ship their own local `README.md` (for example `src/lib/api/`, `src/lib/auth/`, `src/features/auth/`, `src/i18n/`) so the reasoning behind non-obvious decisions travels with the code itself, not just in a top-level doc nobody re-reads six months later.

### Not a black box

Everything Nova generates is plain, ordinary Next.js/React/TypeScript code that you own outright the moment it's written to disk. There's no runtime dependency on the `nova` package inside your generated app, no telemetry, and no CLI daemon watching your project. If you want to rip out a feature, delete the files and the corresponding dependency — that's it.

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
- Database integrations
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
- Extensible plugin architecture

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

The Nova CLI uses the following syntax:

```text
nova [project-name] [options]
```

### Options

```text
-h, --help       Show help
-v, --version    Print the installed version
```

### Examples

Create a project:

```bash
nova my-app
```

Start the interactive setup:

```bash
nova
```

Create a project using npx:

```bash
npx @darkalpha/nova my-app
```

Project names must contain only:

- Lowercase letters
- Numbers
- Dashes
- Underscores

The project name follows:

```text
^[a-z0-9-_]+$
```

Invalid names (spaces, path separators, uppercase letters, `..`) are rejected before any files are written, whether passed as a CLI argument or typed into the interactive prompt.

### Running in CI

When `CI` is set in the environment, Nova automatically skips the "install dependencies now?" confirmation prompt so the process can run non-interactively:

```bash
CI=true npx @darkalpha/nova my-app
```

You'll still want to run the package manager's install command afterward as a separate CI step.

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

The available options depend on the version of Nova you are using.

## Data and Backend

- Prisma ORM
- Better Auth
- Redis
- Strapi CMS
- OpenAPI typed client

## Data Fetching and State

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

## Infrastructure and Operations

- Docker
- Docker Compose
- Husky
- lint-staged
- PWA
- Bundle Analyzer
- Sentry
- Health and readiness endpoints
- Security headers

## Design and UX

- Design System
- Animations
- Recharts

### Plugin summary table

| Category                      | Options                                                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Data and Backend              | Prisma ORM, Better Auth, Redis, Strapi CMS, OpenAPI typed client                                                        |
| Data Fetching and State       | TanStack Query, TanStack Table, Zustand, MSW API mocking                                                                |
| Testing                       | Vitest, Playwright, Cypress, Storybook                                                                                  |
| Content and Communication     | React Email, Mailpit, Tiptap rich text editor                                                                           |
| Infrastructure and Operations | Docker, Docker Compose, Husky + lint-staged, PWA, Bundle Analyzer, Sentry, Health/readiness endpoints, Security headers |
| Design and UX                 | Design System, Animations, Recharts                                                                                     |

Each plugin is a self-contained overlay under `templates/addons/<name>`. Enabling it copies its files on top of the base template and automatically wires in the required dependencies, scripts, and environment variables — there's no manual wiring step after generation.

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
│   ├── prompts.ts
│   ├── generator.ts
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
│   └── smoke-test.mjs
│
└── docs/
    └── migration/
```

- **`bin/nova.js`** — the published CLI entrypoint (used by `npm start` or `npx`).
- **`src/generator.ts`** — high-level generator logic: copies templates, applies add-ons, writes `package.json`, and patches generated files (Next.js config, providers, middleware, README) based on selected features.
- **`src/prompts.ts`** — the interactive `@clack/prompts`-based CLI flow.
- **`src/packageManifest.ts`** — builds the generated project's `package.json` (scripts + dependencies) from the selected feature set.
- **`packages/core/`** — `@nova/core`, a framework-agnostic workspace package with zero feature-specific logic: template/filesystem copying, package-manager command resolution, prompt cancel-handling, and logging. Built once and bundled into the CLI at publish time.
- **`templates/base/`** — the complete base Next.js App Router project that every generated app starts from.
- **`templates/addons/`** — one folder per optional feature; each overlays files on top of `templates/base` when enabled.
- **`templates/ui/`** — one folder per alternative UI library, overlaid last so provider wiring and examples land correctly.

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

The goal is to keep each plugin isolated, explicit, and easy to maintain. There is no deep merge logic — an overlay file simply replaces the base file at the same path, so it's always obvious, by reading the addon folder, exactly what it changes.

UI library overlays (`templates/ui/*`) are applied last, after all selected addons, so provider wiring (e.g. wrapping `<AppProviders>` with `<MuiProvider>` or `<ChakraAppProvider>`) is consistent regardless of which other addons were selected.

---

## Example Configurations

**Minimal marketing or landing site**

```text
UI:      shadcn
Plugins: (none)
```

**SaaS app with a Postgres backend**

```text
UI:      shadcn
Plugins: Prisma, Better Auth, TanStack Query, Sentry, Docker
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
└── ...
```

Plus module-local `README.md` files inside `src/lib/api/`, `src/lib/auth/`, `src/features/auth/`, and `src/i18n/` explaining the reasoning behind non-obvious implementation choices — for example why token refresh coalesces concurrent requests, or why the root `layout.tsx` is intentionally minimal.

---

## Environment Variables

Generated projects include a `.env.example` covering every variable the scaffold understands, grouped by category:

- **App** — public URL/name, safe to expose via `NEXT_PUBLIC_*`
- **Database** — `DATABASE_URL`, used by Prisma if enabled
- **Authentication** — token secrets/TTLs for the custom rotation system, or Better Auth secrets if that module is enabled
- **External APIs** — base URL/timeout for `src/lib/api`
- **Sentry** — DSNs and trace sample rates, when Sentry is enabled

`.env` itself is never committed — only `.env.example` is tracked in generated projects. When you add a new environment variable, add it to both `.env` and `.env.example` together, and to `src/config/env.ts` if the app should fail fast at boot when it's missing.

---

## Deployment

**Vercel (recommended default)** — push to a connected git repository; Vercel auto-detects Next.js. Set the environment variables from `.env.example` in the Vercel project settings.

**Docker (if selected during generation)**

```bash
docker build -t app .
docker run -p 3000:3000 --env-file .env app
```

The generated `Dockerfile` uses a multi-stage build (deps → build → runtime) and Next.js `output: "standalone"` for a minimal production image.

Every variable in `.env.example` must be set in production — missing required variables fail fast at boot if you're using the generated `src/config/env.ts` validation.

---

## FAQ

**Does Nova lock me into a specific backend?**
No. The generated API layer (`src/lib/api`) is a thin, typed fetch wrapper you point at any backend via `API_BASE_URL`. Nothing in the generated code assumes a specific server framework or database.

**Can I remove a feature after generating the project?**
Yes. Everything Nova writes is plain, readable TypeScript/React you own outright — delete the files and the corresponding dependency entries in `package.json`. There's no hidden runtime tying the app back to the `nova` CLI package.

**Does Nova modify my project after generation, or phone home?**
No. Nova runs once, at generation time, entirely locally. There's no CLI daemon, no telemetry, and no ongoing dependency on `nova`/`@darkalpha/nova` inside the generated app.

**Can I use Nova in CI?**
Yes — pass a project name as a CLI argument and set `CI=true` in the environment; Nova will skip the interactive "install now?" confirmation and generate non-interactively.

**Which package managers are supported?**
pnpm, npm, yarn, and bun. Whichever you choose during setup is used consistently for the generated scripts and documented install/dev commands in the project's own `README.md`.

**What if I select a UI library other than shadcn — do I still get shadcn's primitives?**
The `templates/ui/<library>` overlay is applied after the base template and after your selected addons, wiring in that library's provider and a couple of example components. shadcn-style primitives in `src/components/ui` remain in the tree unless you remove them; feel free to delete what you don't use.

**Can I add a plugin that isn't listed?**
Yes — see [Adding a New Plugin](#adding-a-new-plugin). Plugins are just overlay folders under `templates/addons/<name>` plus a feature flag and a `package.json` patch, so adding one to a fork of Nova is a small, mechanical change.

---

## Troubleshooting

**`Directory "my-app" already exists and is not empty.`**
Nova refuses to generate into a non-empty directory to avoid clobbering existing files. Pick a different project name or empty the target directory first.

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

Run the compiled CLI:

```bash
npm start
```

If the project uses the `@nova/core` workspace package, run `npm install` from the repository root before running development, build, or type-check commands.

---

# Testing the Generator

Nova includes end-to-end smoke tests for generated projects.

Run:

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

When adding or modifying a plugin, update the relevant smoke tests.

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

3. Register the plugin in:

```text
src/generator.ts
```

4. Add dependencies and scripts to:

```text
src/packageManifest.ts
```

5. Add plugin-specific environment variables.

6. Add documentation.

7. Add smoke tests.

8. Verify that the plugin works independently.

9. Verify compatibility with related plugins.

10. Run the complete test suite.

Keep templates and dependency configuration synchronized.

A plugin that generates files without adding required dependencies, or adds dependencies without generating the required files, is usually a bug.

---

# Contributing

Contributions are welcome.

Before submitting changes:

```bash
npm install
npm run typecheck
npm run build
node scripts/smoke-test.mjs
```

When contributing a new plugin or UI integration:

- Keep the plugin isolated.
- Avoid unnecessary dependencies.
- Follow the existing architecture.
- Update documentation.
- Add tests.
- Add smoke-test coverage.
- Document plugin conflicts and dependencies.
- Keep generated applications production-ready.

Prefer small, focused changes.

---

## Links

- [npm package](https://www.npmjs.com/package/@darkalpha/nova)
- [Report an issue](https://github.com/YOUR_USERNAME/nova/issues)
- [Source code](https://github.com/YOUR_USERNAME/nova)

---

# License

MIT
