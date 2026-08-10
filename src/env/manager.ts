import fs from "fs-extra";
import path from "node:path";
import { readProjectConfig } from "../project.js";
import { getPluginRegistry } from "../plugin/legacyAdapter.js";
import type { EnvCheckResult, EnvSyncResult, EnvVarStatus } from "./types.js";

/**
 * Parses existing environment keys from a .env file format without storing secret values in memory.
 */
export async function parseEnvKeysOnly(filePath: string): Promise<Set<string>> {
  const keys = new Set<string>();
  if (!(await fs.pathExists(filePath))) return keys;

  const content = await fs.readFile(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match && match[1]) {
      keys.add(match[1]);
    }
  }

  return keys;
}

export async function getProjectEnvStatus(targetDir: string): Promise<EnvCheckResult> {
  const config = await readProjectConfig(targetDir);
  const activePlugins = config?.plugins ?? [];

  const registry = getPluginRegistry();
  const declaredVars: Map<string, { required: boolean; description?: string; pluginId?: string; example?: string }> = new Map();

  for (const pluginId of activePlugins) {
    const manifest = registry.getPlugin(pluginId);
    if (!manifest?.env) continue;
    for (const item of manifest.env) {
      if (!declaredVars.has(item.key) || item.required) {
        declaredVars.set(item.key, {
          required: item.required ?? false,
          description: item.description,
          pluginId,
          example: item.example,
        });
      }
    }
  }

  // Check presence in .env, .env.local, .env.development
  const envPath = path.join(targetDir, ".env");
  const envLocalPath = path.join(targetDir, ".env.local");
  const envDevPath = path.join(targetDir, ".env.development");

  const presentKeys = new Set<string>();
  for (const key of await parseEnvKeysOnly(envPath)) presentKeys.add(key);
  for (const key of await parseEnvKeysOnly(envLocalPath)) presentKeys.add(key);
  for (const key of await parseEnvKeysOnly(envDevPath)) presentKeys.add(key);

  const variables: EnvVarStatus[] = [];
  const missingRequired: string[] = [];
  let totalRequired = 0;
  let totalOptional = 0;
  let configuredCount = 0;

  for (const [key, meta] of declaredVars.entries()) {
    const present = presentKeys.has(key) || Boolean(process.env[key]);
    if (meta.required) {
      totalRequired += 1;
      if (!present) {
        missingRequired.push(key);
      }
    } else {
      totalOptional += 1;
    }

    if (present) configuredCount += 1;

    variables.push({
      key,
      required: meta.required,
      description: meta.description,
      present,
      pluginId: meta.pluginId,
      example: meta.example,
    });
  }

  return {
    ok: missingRequired.length === 0,
    totalRequired,
    missingRequired,
    totalOptional,
    configuredCount,
    variables,
  };
}

export async function syncProjectEnvExample(targetDir: string): Promise<EnvSyncResult> {
  const config = await readProjectConfig(targetDir);
  const activePlugins = config?.plugins ?? [];
  const registry = getPluginRegistry();

  const envExamplePath = path.join(targetDir, ".env.example");
  const existingKeys = await parseEnvKeysOnly(envExamplePath);
  const isNew = !(await fs.pathExists(envExamplePath));

  let content = isNew ? "# Environment Configuration\n" : await fs.readFile(envExamplePath, "utf8");

  const addedKeys: string[] = [];

  for (const pluginId of activePlugins) {
    const manifest = registry.getPlugin(pluginId);
    if (!manifest?.env) continue;

    const unaddedForPlugin: Array<{ key: string; example?: string; description?: string }> = [];

    for (const item of manifest.env) {
      if (!existingKeys.has(item.key) && !addedKeys.includes(item.key)) {
        unaddedForPlugin.push(item);
        addedKeys.push(item.key);
      }
    }

    if (unaddedForPlugin.length > 0) {
      content += `\n# --- ${manifest.name} (${manifest.id}) ---\n`;
      for (const item of unaddedForPlugin) {
        if (item.description) {
          content += `# ${item.description}\n`;
        }
        content += `${item.key}=${item.example ?? ""}\n`;
      }
    }
  }

  await fs.writeFile(envExamplePath, content.trim() + "\n", "utf8");

  return {
    created: isNew,
    updated: addedKeys.length > 0,
    addedKeys,
    existingKeysCount: existingKeys.size,
    envExamplePath,
  };
}
