import { getPreset } from "../presets/registry.js";
import { getPluginRegistry } from "../plugin/legacyAdapter.js";
import { resolveDependencyGraph } from "../plugin/dependencyGraph.js";
import { OFFICIAL_TEMPLATES } from "./official.js";
import type { TemplateDefinition, TemplateResolution } from "./types.js";
import type { FeatureKey } from "../types.js";

export * from "./types.js";
export * from "./official.js";

class TemplateRegistry {
  private templates = new Map<string, TemplateDefinition>();
  private aliases = new Map<string, string>();

  constructor() {
    for (const tpl of OFFICIAL_TEMPLATES) {
      this.register(tpl);
    }
  }

  register(template: TemplateDefinition): void {
    const key = template.id.toLowerCase();
    this.templates.set(key, template);
    if (template.aliases) {
      for (const alias of template.aliases) {
        this.aliases.set(alias.toLowerCase(), key);
      }
    }
  }

  get(id: string): TemplateDefinition | undefined {
    const normalized = id.toLowerCase();
    if (this.templates.has(normalized)) {
      return this.templates.get(normalized);
    }
    const aliased = this.aliases.get(normalized);
    if (aliased && this.templates.has(aliased)) {
      return this.templates.get(aliased);
    }
    return undefined;
  }

  list(): TemplateDefinition[] {
    return Array.from(this.templates.values());
  }

  resolve(id: string): TemplateResolution {
    const template = this.get(id);
    if (!template) {
      return {
        valid: false,
        template: {
          id,
          name: id,
          description: "Unknown template",
        },
        resolvedPlugins: [],
        uiLibrary: "shadcn",
        issues: [`Unknown template "${id}". Available: ${this.list().map((t) => t.id).join(", ")}`],
      };
    }

    let plugins: FeatureKey[] = [...(template.plugins ?? [])];
    let uiLibrary = template.defaultUiLibrary ?? "shadcn";

    if (template.presetId) {
      const preset = getPreset(template.presetId);
      if (preset) {
        plugins = [...new Set([...plugins, ...preset.plugins])];
        if (preset.defaultUiLibrary && !template.defaultUiLibrary) {
          uiLibrary = preset.defaultUiLibrary;
        }
      }
    }

    const registry = getPluginRegistry();
    const graphResult = resolveDependencyGraph(plugins, registry);
    const issues = graphResult.issues.map((i) => `[${i.type}] ${i.message}`);

    return {
      valid: issues.length === 0,
      template,
      resolvedPlugins: graphResult.order as FeatureKey[],
      uiLibrary,
      issues,
    };
  }
}

let globalTemplateRegistry: TemplateRegistry | undefined;

export function getTemplateRegistry(): TemplateRegistry {
  if (!globalTemplateRegistry) {
    globalTemplateRegistry = new TemplateRegistry();
  }
  return globalTemplateRegistry;
}

export function getTemplate(id: string): TemplateDefinition | undefined {
  return getTemplateRegistry().get(id);
}

export function listTemplates(): TemplateDefinition[] {
  return getTemplateRegistry().list();
}

export function resolveTemplate(id: string): TemplateResolution {
  return getTemplateRegistry().resolve(id);
}

