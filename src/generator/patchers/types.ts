import type { FeatureFlags, UiLibrary } from "../../types.js";

/** Shared read-only context every config contribution is evaluated against. */
export interface PatchContext {
  readonly features: FeatureFlags;
  readonly uiLibrary: UiLibrary;
}

/**
 * A `next.config.mjs` placeholder swap: when the owning feature is enabled,
 * `whenEnabled` replaces the placeholder comment with real config; when
 * disabled, `whenDisabled` strips the placeholder line entirely so the
 * generated file never ships dead comments.
 */
export interface NextConfigPlaceholderContribution {
  feature: keyof FeatureFlags;
  whenEnabled: (content: string) => string;
  whenDisabled: (content: string) => string;
}

/**
 * A `next.config.mjs` wrapping contribution (e.g. `withPWAInit(...)`,
 * `withSentryConfig(...)`). Only ever applied when `feature` is enabled;
 * there is nothing to clean up when it's disabled since it never touches
 * the file in that case.
 */
export interface NextConfigWrapContribution {
  feature: keyof FeatureFlags;
  transform: (content: string) => string;
}

/**
 * A single provider that should wrap `<AppProviders>`'s children. `active`
 * decides whether this contribution applies for the current generation
 * (based on selected UI library and/or features).
 */
export interface ProviderContribution {
  active: (ctx: PatchContext) => boolean;
  importLine: string;
  open: string;
  close: string;
}

/** A middleware contribution, gated by a single feature flag. */
export interface MiddlewareContribution {
  feature: keyof FeatureFlags;
  /** Idempotency guard - skipped if the marker is already present in the file. */
  marker: string;
  transform: (content: string) => string;
}