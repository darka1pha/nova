import type { PluginCategory, PluginId, PluginManifest } from "./types.js";

/**
 * Holds every known plugin manifest and answers the handful of queries the
 * rest of the platform needs: look up by id, list everything, list by
 * category. Deliberately has no knowledge of *how* plugins are discovered
 * (folder scanning, static imports, the Phase 1 legacy adapter, a future
 * npm-published plugin) - callers populate it via `register`/`registerAll`,
 * keeping discovery strategy decoupled from lookup.
 */
export class PluginRegistry {
  private plugins = new Map<PluginId, PluginManifest>();

  register(plugin: PluginManifest): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin "${plugin.id}" is already registered.`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  registerAll(plugins: PluginManifest[]): void {
    for (const plugin of plugins) this.register(plugin);
  }

  getPlugin(id: PluginId): PluginManifest | undefined {
    return this.plugins.get(id);
  }

  requirePlugin(id: PluginId): PluginManifest {
    const plugin = this.getPlugin(id);
    if (!plugin) throw new Error(`Unknown plugin: "${id}".`);
    return plugin;
  }

  getAllPlugins(): PluginManifest[] {
    return Array.from(this.plugins.values()).sort((a, b) => a.id.localeCompare(b.id));
  }

  getPluginsByCategory(category: PluginCategory): PluginManifest[] {
    return this.getAllPlugins().filter((plugin) => plugin.category === category);
  }

  has(id: PluginId): boolean {
    return this.plugins.has(id);
  }
}