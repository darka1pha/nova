import type { PluginCategory, PluginId, PluginManifest, PluginTrustLevel } from "../plugin/types.js";

export type { PluginTrustLevel };

export interface RegistryPluginMetadata extends PluginManifest {
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  trustLevel?: PluginTrustLevel;
  downloads?: number;
  stars?: number;
  publishedAt?: string;
  source?: "builtin" | "local" | "remote";
}

export interface PluginSearchResult {
  plugin: RegistryPluginMetadata;
  source: "builtin" | "local" | "remote";
  matchReason?: string;
}

export interface PluginSecurityCheckResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface RegistrySource {
  name: string;
  search(query: string): Promise<PluginSearchResult[]>;
  get(id: string): Promise<RegistryPluginMetadata | null>;
  resolve(id: string, version?: string): Promise<RegistryPluginMetadata | null>;
}
