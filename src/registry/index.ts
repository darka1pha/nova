import pc from "picocolors";
import path from "node:path";
import { BuiltinPluginSource } from "./sources/builtin.js";
import { LocalPluginSource } from "./sources/local.js";
import { RemotePluginSource } from "./sources/remote.js";
import type {
  PluginSearchResult,
  PluginSecurityCheckResult,
  PluginTrustLevel,
  RegistryPluginMetadata,
  RegistrySource,
} from "./types.js";
import type { PluginManifest } from "../plugin/types.js";

export * from "./types.js";
export * from "./sources/builtin.js";
export * from "./sources/local.js";
export * from "./sources/remote.js";

const VALID_PLUGIN_ID_REGEX = /^(@[a-z0-9-_]+\/)?[a-z0-9-_]+$/i;

export function isValidPluginId(id: string): boolean {
  if (!id || typeof id !== "string") return false;
  if (id.includes("..") || id.includes("\\") || id.includes("/") && !id.startsWith("@")) {
    return false;
  }
  return VALID_PLUGIN_ID_REGEX.test(id);
}

export function validatePluginSecurity(
  manifest: PluginManifest,
  targetDir?: string,
): PluginSecurityCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Validate Plugin ID
  if (!isValidPluginId(manifest.id)) {
    errors.push(`Invalid plugin ID "${manifest.id}". Plugin IDs must be safe alphanumeric names or @scoped/names.`);
  }

  // 2. Validate template paths (Prevent Path Traversal)
  if (manifest.templates) {
    for (const tpl of manifest.templates) {
      if (tpl.src.includes("..")) {
        errors.push(`Template source path "${tpl.src}" contains invalid ".." traversal sequence.`);
      }
      if (path.isAbsolute(tpl.src) && targetDir) {
        const relative = path.relative(targetDir, tpl.src);
        if (relative.startsWith("..") && !tpl.src.includes("node_modules")) {
          warnings.push(`Template source "${tpl.src}" is outside the target project boundary.`);
        }
      }
    }
  }

  // 3. Validate patch targets
  if (manifest.patches) {
    for (const patch of manifest.patches) {
      if (patch.target.includes("..") || path.isAbsolute(patch.target)) {
        errors.push(`Patch target "${patch.target}" must be a relative path inside the project root.`);
      }
    }
  }

  // 4. Validate doc paths
  if (manifest.docs) {
    for (const doc of manifest.docs) {
      if (doc.path.includes("..") || path.isAbsolute(doc.path)) {
        errors.push(`Documentation path "${doc.path}" must be a relative path inside the project root.`);
      }
    }
  }

  // 5. Trust level advisory
  if (manifest.trustLevel === "experimental") {
    warnings.push(`Plugin "${manifest.id}" is marked as experimental.`);
  } else if (manifest.trustLevel === "community") {
    warnings.push(`Plugin "${manifest.id}" is a community plugin. Review permissions before running in production.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function formatTrustBadge(trustLevel?: PluginTrustLevel): string {
  switch (trustLevel) {
    case "official":
      return pc.green("✓ Official");
    case "verified":
      return pc.cyan("✓ Verified");
    case "experimental":
      return pc.magenta("⚡ Experimental");
    case "community":
    default:
      return pc.yellow("⚠ Community");
  }
}

export class PluginRegistryManager {
  private sources: RegistrySource[] = [];

  constructor(sources?: RegistrySource[]) {
    this.sources = sources ?? [
      new BuiltinPluginSource(),
      new LocalPluginSource(),
      new RemotePluginSource(),
    ];
  }

  addSource(source: RegistrySource): void {
    this.sources.push(source);
  }

  async search(
    query = "",
    options: { category?: string; trustLevel?: PluginTrustLevel } = {},
  ): Promise<PluginSearchResult[]> {
    const allResults: PluginSearchResult[] = [];
    const seen = new Set<string>();

    for (const source of this.sources) {
      try {
        const results = await source.search(query);
        for (const res of results) {
          if (seen.has(res.plugin.id)) continue;

          if (options.category && res.plugin.category !== options.category) {
            continue;
          }
          if (options.trustLevel && res.plugin.trustLevel !== options.trustLevel) {
            continue;
          }

          seen.add(res.plugin.id);
          allResults.push(res);
        }
      } catch {
        // Graceful isolation
      }
    }

    return allResults;
  }

  async get(id: string): Promise<RegistryPluginMetadata | null> {
    for (const source of this.sources) {
      try {
        const match = await source.get(id);
        if (match) return match;
      } catch {
        // Fall through to next source
      }
    }
    return null;
  }

  async resolve(id: string, version?: string): Promise<RegistryPluginMetadata | null> {
    for (const source of this.sources) {
      try {
        const match = await source.resolve(id, version);
        if (match) return match;
      } catch {
        // Fall through to next source
      }
    }
    return null;
  }
}

let globalRegistryManager: PluginRegistryManager | undefined;

export function getPluginRegistryManager(): PluginRegistryManager {
  if (!globalRegistryManager) {
    globalRegistryManager = new PluginRegistryManager();
  }
  return globalRegistryManager;
}
