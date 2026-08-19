import type { FeatureKey, PackageManager, UiLibrary } from "../types.js";

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  category?: string;
  features?: string[];
  presetId?: string;
  plugins?: FeatureKey[];
  defaultUiLibrary?: UiLibrary;
  defaultPackageManager?: PackageManager;
  structure?: "nextjs" | "react-native";
  defaults?: Record<string, unknown>;
  compatibility?: {
    node?: string;
    next?: string;
    react?: string;
    plugins?: string[];
  };
  aliases?: string[];
  starterFiles?: Record<string, string>;
}

export interface TemplateResolution {
  valid: boolean;
  template: TemplateDefinition;
  resolvedPlugins: FeatureKey[];
  uiLibrary: UiLibrary;
  issues: string[];
}
