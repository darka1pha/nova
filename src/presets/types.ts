import type { FeatureKey, PackageManager, UiLibrary } from "../types.js";

export interface PresetDefinition {
  id: string;
  name: string;
  description: string;
  category?: string;
  plugins: FeatureKey[];
  defaultUiLibrary?: UiLibrary;
  defaultPackageManager?: PackageManager;
  envDefaults?: Record<string, string>;
  config?: Record<string, unknown>;
}

export interface PresetResolutionResult {
  valid: boolean;
  preset: PresetDefinition;
  resolvedPlugins: FeatureKey[];
  issues: string[];
}
