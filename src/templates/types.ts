import type { FeatureKey, PackageManager, UiLibrary } from "../types.js";

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  presetId?: string;
  plugins?: FeatureKey[];
  defaultUiLibrary?: UiLibrary;
  defaultPackageManager?: PackageManager;
  structure?: "nextjs" | "react-native";
  starterFiles?: Record<string, string>;
}

export interface TemplateResolution {
  valid: boolean;
  template: TemplateDefinition;
  resolvedPlugins: FeatureKey[];
  uiLibrary: UiLibrary;
  issues: string[];
}
