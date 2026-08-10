import fs from "fs-extra";
import path from "node:path";
import type { PluginManifest } from "../../plugin/types.js";
import type { PluginSearchResult, RegistryPluginMetadata, RegistrySource } from "../types.js";

/**
 * Local source for discovering and resolving plugins from the local file system.
 */
export class LocalPluginSource implements RegistrySource {
  readonly name = "local";
  private searchDirs: string[];

  constructor(searchDirs: string[] = [path.resolve(process.cwd(), "plugins")]) {
    this.searchDirs = searchDirs;
  }

  async search(query: string): Promise<PluginSearchResult[]> {
    const results: PluginSearchResult[] = [];
    const q = query.trim().toLowerCase();

    for (const dir of this.searchDirs) {
      if (!(await fs.pathExists(dir))) continue;

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const pluginDir = path.join(dir, entry.name);
          const manifest = await this.readLocalManifest(pluginDir);
          if (!manifest) continue;

          const matches =
            !q ||
            manifest.id.toLowerCase().includes(q) ||
            manifest.name.toLowerCase().includes(q) ||
            manifest.description.toLowerCase().includes(q);

          if (matches) {
            results.push({
              plugin: {
                ...manifest,
                trustLevel: manifest.trustLevel ?? "community",
                source: "local",
              },
              source: "local",
            });
          }
        }
      } catch {
        // Ignore unreadable directory
      }
    }

    return results;
  }

  async get(id: string): Promise<RegistryPluginMetadata | null> {
    for (const dir of this.searchDirs) {
      const candidatePath = path.join(dir, id);
      const manifest = await this.readLocalManifest(candidatePath);
      if (manifest && manifest.id === id) {
        return {
          ...manifest,
          trustLevel: manifest.trustLevel ?? "community",
          source: "local",
        };
      }
    }
    return null;
  }

  async resolve(id: string): Promise<RegistryPluginMetadata | null> {
    return this.get(id);
  }

  private async readLocalManifest(pluginDir: string): Promise<PluginManifest | null> {
    try {
      const manifestJsonPath = path.join(pluginDir, "nova-plugin.json");
      if (await fs.pathExists(manifestJsonPath)) {
        return await fs.readJson(manifestJsonPath);
      }

      const pkgJsonPath = path.join(pluginDir, "package.json");
      if (await fs.pathExists(pkgJsonPath)) {
        const pkg = await fs.readJson(pkgJsonPath);
        if (pkg.novaPlugin) {
          return {
            id: pkg.name ?? path.basename(pluginDir),
            name: pkg.novaPlugin.name ?? pkg.name,
            version: pkg.version ?? "1.0.0",
            description: pkg.description ?? "",
            category: pkg.novaPlugin.category ?? "developer-experience",
            trustLevel: "community",
            ...pkg.novaPlugin,
          };
        }
      }
    } catch {
      return null;
    }
    return null;
  }
}
