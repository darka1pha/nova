import fs from "fs-extra";
import path from "node:path";

import type { PluginRegistry } from "./registry.js";
import type { EnvVarContribution, PluginId } from "./types.js";

const ENV_KEY_PATTERN = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/;

export interface ApplyEnvResult {
  /** Keys actually appended to .env.example, in application order. */
  addedKeys: string[];
  /** Keys a plugin declared that were already present (in the file, or
   * from an earlier plugin in this same run) and were therefore skipped. */
  skippedKeys: string[];
}

/**
 * Extracts every `KEY=` at the start of a line from an existing
 * `.env.example`'s content, ignoring comments and blank lines. Used both
 * to avoid re-declaring a variable a plugin's addon template already
 * ships (e.g. Prisma's `DATABASE_URL`, already present in
 * `templates/base/.env.example`) and to avoid two plugins in the same run
 * declaring the same key twice.
 */
function extractExistingKeys(content: string): Set<string> {
  const keys = new Set<string>();
  for (const line of content.split("\n")) {
    const match = ENV_KEY_PATTERN.exec(line);
    if (match) keys.add(match[1]);
  }
  return keys;
}

function renderEntry(entry: EnvVarContribution): string {
  const lines: string[] = [];
  if (entry.description) lines.push(`# ${entry.description}`);
  lines.push(`${entry.key}=${entry.example ?? ""}`);
  return lines.join("\n");
}

/**
 * Appends every `EnvVarContribution` declared by each enabled plugin (in
 * `enabledPlugins` order) to the project's `.env.example`, skipping any
 * key that's already present - whether baked into the base template
 * (most legacy addons' variables already live in
 * `templates/base/.env.example`, gated by comments rather than a
 * structured contribution) or declared by an earlier plugin in this same
 * run. This is purely additive: existing `.env.example` content, section
 * headers, and ordering are never rewritten, only appended to.
 *
 * No-ops (returns `{ addedKeys: [], skippedKeys: [] }` and touches
 * nothing on disk) if `.env.example` doesn't exist or no plugin declares
 * any new keys, so calling this for a project with no env-contributing
 * plugins selected is always a cheap no-op.
 */
export async function appendPluginEnvContributions(
  targetDir: string,
  enabledPlugins: PluginId[],
  registry: PluginRegistry,
): Promise<ApplyEnvResult> {
  const envPath = path.join(targetDir, ".env.example");
  if (!(await fs.pathExists(envPath))) {
    return { addedKeys: [], skippedKeys: [] };
  }

  const content = await fs.readFile(envPath, "utf8");
  const existingKeys = extractExistingKeys(content);

  const addedKeys: string[] = [];
  const skippedKeys: string[] = [];
  const newEntries: EnvVarContribution[] = [];

  for (const id of enabledPlugins) {
    const plugin = registry.getPlugin(id);
    if (!plugin?.env?.length) continue;

    for (const entry of plugin.env) {
      if (existingKeys.has(entry.key)) {
        skippedKeys.push(entry.key);
        continue;
      }
      existingKeys.add(entry.key); // dedup across plugins within this run
      newEntries.push(entry);
      addedKeys.push(entry.key);
    }
  }

  if (newEntries.length === 0) {
    return { addedKeys, skippedKeys };
  }

  const block = [
    "",
    "# --- Plugin-contributed environment variables ---",
    ...newEntries.map(renderEntry),
    "",
  ].join("\n");

  await fs.writeFile(envPath, content.replace(/\n*$/, "\n") + block, "utf8");

  return { addedKeys, skippedKeys };
}