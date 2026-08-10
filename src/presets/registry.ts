import { getPluginRegistry } from "../plugin/legacyAdapter.js";
import { resolveDependencyGraph } from "../plugin/dependencyGraph.js";
import { OFFICIAL_PRESETS } from "./official.js";
import type { PresetDefinition, PresetResolutionResult } from "./types.js";
import type { FeatureKey } from "../types.js";

export * from "./types.js";
export * from "./official.js";

class PresetRegistry {
  private presets = new Map<string, PresetDefinition>();

  constructor() {
    for (const preset of OFFICIAL_PRESETS) {
      this.register(preset);
    }
  }

  register(preset: PresetDefinition): void {
    this.presets.set(preset.id.toLowerCase(), preset);
  }

  get(id: string): PresetDefinition | undefined {
    return this.presets.get(id.toLowerCase());
  }

  list(): PresetDefinition[] {
    return Array.from(this.presets.values());
  }

  resolve(id: string): PresetResolutionResult {
    const preset = this.get(id);
    if (!preset) {
      return {
        valid: false,
        preset: {
          id,
          name: id,
          description: "Unknown preset",
          plugins: [],
        },
        resolvedPlugins: [],
        issues: [`Unknown preset "${id}". Available: ${this.list().map((p) => p.id).join(", ")}`],
      };
    }

    const registry = getPluginRegistry();
    const graphResult = resolveDependencyGraph(preset.plugins, registry);

    const issues = graphResult.issues.map((i) => `[${i.type}] ${i.message}`);

    return {
      valid: issues.length === 0,
      preset,
      resolvedPlugins: graphResult.order as FeatureKey[],
      issues,
    };
  }
}

let globalPresetRegistry: PresetRegistry | undefined;

export function getPresetRegistry(): PresetRegistry {
  if (!globalPresetRegistry) {
    globalPresetRegistry = new PresetRegistry();
  }
  return globalPresetRegistry;
}

export function getPreset(id: string): PresetDefinition | undefined {
  return getPresetRegistry().get(id);
}

export function listPresets(): PresetDefinition[] {
  return getPresetRegistry().list();
}

export function resolvePreset(id: string): PresetResolutionResult {
  return getPresetRegistry().resolve(id);
}
