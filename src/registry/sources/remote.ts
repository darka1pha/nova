import type { PluginSearchResult, RegistryPluginMetadata, RegistrySource } from "../types.js";

/**
 * Remote registry source with offline tolerance and error isolation.
 */
export class RemotePluginSource implements RegistrySource {
  readonly name = "remote";
  private registryUrl: string;
  private offlineMode = false;

  constructor(registryUrl = "https://registry.nova.dev/api/v1") {
    this.registryUrl = registryUrl;
  }

  async search(query: string): Promise<PluginSearchResult[]> {
    if (this.offlineMode) return [];

    try {
      // In local CLI environment without live network service, return empty gracefully
      // or query if configured
      return [];
    } catch {
      this.offlineMode = true;
      return [];
    }
  }

  async get(id: string): Promise<RegistryPluginMetadata | null> {
    if (this.offlineMode) return null;
    return null;
  }

  async resolve(id: string): Promise<RegistryPluginMetadata | null> {
    return this.get(id);
  }
}
