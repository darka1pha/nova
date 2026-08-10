import { getPluginRegistry } from "../../plugin/legacyAdapter.js";
import type { PluginSearchResult, RegistryPluginMetadata, RegistrySource } from "../types.js";

/**
 * Built-in source querying all native & legacy plugins bundled with Nova.
 */
export class BuiltinPluginSource implements RegistrySource {
  readonly name = "builtin";

  async search(query: string): Promise<PluginSearchResult[]> {
    const registry = getPluginRegistry();
    const all = registry.getAllPlugins();
    const q = query.trim().toLowerCase();

    const matches: PluginSearchResult[] = [];

    for (const plugin of all) {
      const idMatch = plugin.id.toLowerCase().includes(q);
      const nameMatch = plugin.name.toLowerCase().includes(q);
      const descMatch = plugin.description.toLowerCase().includes(q);
      const categoryMatch = plugin.category.toLowerCase().includes(q);
      const tagMatch = plugin.tags?.some((t) => t.toLowerCase().includes(q));
      const capMatch = plugin.capabilities?.some((c) => c.toLowerCase().includes(q));

      if (!q || idMatch || nameMatch || descMatch || categoryMatch || tagMatch || capMatch) {
        matches.push({
          plugin: this.enrichMetadata(plugin),
          source: "builtin",
          matchReason: idMatch ? "id" : nameMatch ? "name" : categoryMatch ? "category" : "keyword",
        });
      }
    }

    return matches;
  }

  async get(id: string): Promise<RegistryPluginMetadata | null> {
    const registry = getPluginRegistry();
    const plugin = registry.getPlugin(id);
    if (!plugin) return null;
    return this.enrichMetadata(plugin);
  }

  async resolve(id: string): Promise<RegistryPluginMetadata | null> {
    return this.get(id);
  }

  private enrichMetadata(plugin: ReturnType<typeof getPluginRegistry> extends { getAllPlugins(): (infer P)[] } ? P : never): RegistryPluginMetadata {
    return {
      ...plugin,
      author: plugin.author ?? "Nova Core Team",
      license: plugin.license ?? "MIT",
      trustLevel: plugin.trustLevel ?? "official",
      source: "builtin",
      compatibility: plugin.compatibility ?? { nova: ">=0.1.0" },
    };
  }
}
