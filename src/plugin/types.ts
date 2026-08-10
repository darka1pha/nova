import type { PackageManager } from "@nova/core";

import type { UiLibrary } from "../types.js";

export type PluginId = string;

export type PluginCategory =
  | "database"
  | "authentication"
  | "state"
  | "cms"
  | "analytics"
  | "monitoring"
  | "ai"
  | "payments"
  | "storage"
  | "email"
  | "infrastructure"
  | "developer-experience"
  | "testing"
  | "documentation"
  | "ui"
  | "api";

export type PluginCapability =
  | "database"
  | "authentication"
  | "api"
  | "state-management"
  | "testing"
  | "deployment"
  | "observability"
  | "email"
  | "cms"
  | "editor"
  | "infrastructure"
  | "security"
  | "ui"
  | "mobile"
  | "ai"
  | "developer-experience";

/**
 * Shared read-only context every plugin contribution (template gating,
 * patches, docs, hooks, validation) is evaluated against. This is the
 * Phase 2 analog of `GeneratorContext` (see `src/generator/context.ts`),
 * scoped to what a self-describing plugin needs rather than internal
 * generator paths/logger plumbing.
 */
export interface PluginResolutionContext {
  projectName: string;
  packageManager: PackageManager;
  uiLibrary: UiLibrary;
  /** Every enabled plugin id for this generation run, including this one. */
  enabledPlugins: PluginId[];
  /** Per-plugin answers collected from that plugin's `prompts`. */
  answers: PluginAnswers;
}

export interface PluginAnswers {
  [pluginId: string]: Record<string, unknown> | undefined;
}

export interface TemplateContribution {
  /** Absolute path (or path relative to the plugin's own folder) to a
   * folder of files to overlay onto the generated project, following the
   * same overlay-wins semantics as `templates/addons/<name>` in Phase 1. */
  src: string;
  /** Optional condition gating whether this template folder applies -
   * e.g. only copy a Postgres compose fragment when the plugin's own
   * prompt answered "postgres". */
  when?: (ctx: PluginResolutionContext) => boolean;
}

export interface EnvVarContribution {
  key: string;
  /** Example/default value written into the generated `.env.example`. */
  example?: string;
  description?: string;
  required?: boolean;
}

export interface PatchContribution {
  /** File the patch targets, relative to the generated project root
   * (e.g. "next.config.mjs", "src/middleware.ts"). */
  target: string;
  /** Human label for logs/debugging. */
  label?: string;
  /** Idempotency guard: if this marker string is already present in the
   * target file, the patch is skipped - mirrors the marker convention
   * already used by `src/generator/patchers/middlewarePatcher.ts`. */
  marker?: string;
  transform: (content: string, ctx: PluginResolutionContext) => string;
}

export interface DocContribution {
  /** Path under the generated project root to write (e.g.
   * "docs/prisma.md" or "src/lib/prisma/README.md"). */
  path: string;
  render: (ctx: PluginResolutionContext) => string;
}

export interface PromptOption<T extends string = string> {
  value: T;
  label: string;
  hint?: string;
}

export type PromptDefinition =
  | {
    type: "select";
    name: string;
    message: string;
    options: PromptOption[];
    default?: string;
  }
  | {
    type: "confirm";
    name: string;
    message: string;
    default?: boolean;
  }
  | {
    type: "multiselect";
    name: string;
    message: string;
    options: PromptOption[];
  }
  | {
    type: "text";
    name: string;
    message: string;
    default?: string;
    validate?: (value: string) => string | undefined;
  };

export interface PluginValidationResult {
  ok: boolean;
  errors: string[];
}

/**
 * Lifecycle hooks a plugin can subscribe to. Names intentionally mirror
 * `src/generator/hooks.ts`'s `HookName` union plus a few finer-grained
 * stages (`beforeRender`/`afterRender`, `beforeInstall`/`afterInstall`,
 * `beforeComplete`/`afterComplete`) that Phase 1's `HookRegistry` doesn't
 * yet emit but is structurally ready to grow into.
 */
export interface PluginHooks {
  beforeGenerate?: (ctx: PluginResolutionContext) => void | Promise<void>;
  afterGenerate?: (ctx: PluginResolutionContext) => void | Promise<void>;
  beforeRender?: (ctx: PluginResolutionContext) => void | Promise<void>;
  afterRender?: (ctx: PluginResolutionContext) => void | Promise<void>;
  beforePatch?: (ctx: PluginResolutionContext) => void | Promise<void>;
  afterPatch?: (ctx: PluginResolutionContext) => void | Promise<void>;
  beforeInstall?: (ctx: PluginResolutionContext) => void | Promise<void>;
  afterInstall?: (ctx: PluginResolutionContext) => void | Promise<void>;
  beforeComplete?: (ctx: PluginResolutionContext) => void | Promise<void>;
  afterComplete?: (ctx: PluginResolutionContext) => void | Promise<void>;
}

export type PluginTrustLevel = "official" | "verified" | "community" | "experimental";

/**
 * The single source of truth for one plugin: everything the CLI's
 * generation, `nova add`, `nova remove`, `nova plugins`, and (eventually)
 * `nova upgrade` need to know about it. See `docs`/`env`/`patches` etc. for
 * the individual contribution shapes - each is optional so a minimal
 * plugin (today's Phase 1 addons, via the legacy adapter) can populate
 * only `id`/`name`/`version`/`description`/`category` plus whichever
 * contributions it actually has.
 */
export interface PluginManifest {
  id: PluginId;
  name: string;
  version: string;
  description: string;
  category: PluginCategory;
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  trustLevel?: PluginTrustLevel;
  compatibility?: {
    nova?: string;
    node?: string;
  };
  icon?: string;
  tags?: string[];
  capabilities?: PluginCapability[];
  owns?: string[];

  templates?: TemplateContribution[];

  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  scripts?: Record<string, string>;

  env?: EnvVarContribution[];
  patches?: PatchContribution[];
  prompts?: PromptDefinition[];
  docs?: DocContribution[];

  /** Other plugin ids that must also be selected for this plugin to make sense. */
  requires?: PluginId[];
  /** Other plugin ids this plugin can optionally integrate with if present. */
  optional?: PluginId[];
  /** Plugin ids that cannot be selected at the same time as this plugin. */
  conflicts?: PluginId[];
  /** Human-readable explanation for why this plugin conflicts with others. */
  conflictReasons?: Record<PluginId, string>;

  supportedUI?: UiLibrary[];
  supportedPackageManagers?: PackageManager[];

  hooks?: PluginHooks;

  /** Self-validation beyond requires/conflicts - e.g. Node version checks,
   * OS restrictions, or cross-field checks on this plugin's own prompt
   * answers. Returning nothing (or `{ ok: true, errors: [] }`) means valid. */
  validate?: (ctx: PluginResolutionContext) => PluginValidationResult | void;
}