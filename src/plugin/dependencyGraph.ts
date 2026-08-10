import type { PluginId } from "./types.js";
import type { PluginRegistry } from "./registry.js";

export interface DependencyIssue {
  type: "missing-requirement" | "conflict" | "unknown-plugin" | "cycle";
  message: string;
  plugin: PluginId;
  related?: PluginId;
}

export interface DependencyGraphResult {
  ok: boolean;
  issues: DependencyIssue[];
  /** Selected plugins in topological order (a plugin's `requires` always
   * appear before it). If a cycle is detected, the cyclic members are
   * still included, appended in their original selection order, so
   * callers always get a complete, deterministic list back even when
   * `ok` is false. */
  order: PluginId[];
}

export interface ResolveDependencyGraphOptions {
  alreadyInstalled?: PluginId[];
}

/**
 * Validates a selected set of plugin ids against a registry and existing project state:
 *  - every id must resolve to a registered plugin,
 *  - every declared `requires` must be in the selection or already installed in the project,
 *  - no selected plugin may conflict with another selected plugin or an already-installed plugin,
 *  - the `requires` graph (restricted to the selection) must be acyclic.
 *
 * Returns every issue found plus a topological ordering of the selection.
 */
export function resolveDependencyGraph(
  selected: PluginId[],
  registry: PluginRegistry,
  options: ResolveDependencyGraphOptions | PluginId[] = {},
): DependencyGraphResult {
  const issues: DependencyIssue[] = [];
  const alreadyInstalledList = Array.isArray(options) ? options : (options.alreadyInstalled ?? []);
  const alreadyInstalledSet = new Set(alreadyInstalledList);
  const selectedSet = new Set(selected);
  const totalActiveSet = new Set([...selected, ...alreadyInstalledList]);

  for (const id of selected) {
    const plugin = registry.getPlugin(id);
    if (!plugin) {
      issues.push({ type: "unknown-plugin", plugin: id, message: `Unknown plugin: "${id}".` });
      continue;
    }

    // Requirements check: requirement must be either in selected or already installed
    for (const requirement of plugin.requires ?? []) {
      if (!totalActiveSet.has(requirement)) {
        const reqName = registry.getPlugin(requirement)?.name ?? requirement;
        issues.push({
          type: "missing-requirement",
          plugin: id,
          related: requirement,
          message: `Plugin "${plugin.name}" requires "${reqName}" to also be installed.`,
        });
      }
    }

    // Conflicts check against other selected plugins
    for (const conflict of plugin.conflicts ?? []) {
      if (selectedSet.has(conflict)) {
        const conflictPlugin = registry.getPlugin(conflict);
        const conflictName = conflictPlugin?.name ?? conflict;
        const reason =
          plugin.conflictReasons?.[conflict] ??
          conflictPlugin?.conflictReasons?.[id] ??
          `${plugin.name} and ${conflictName} conflict with each other.`;
        issues.push({
          type: "conflict",
          plugin: id,
          related: conflict,
          message: `Plugin "${plugin.name}" conflicts with plugin "${conflictName}". Reason: ${reason} Disable one of them and try again.`,
        });
      }

      // Conflicts check against already-installed plugins
      if (alreadyInstalledSet.has(conflict)) {
        const conflictPlugin = registry.getPlugin(conflict);
        const conflictName = conflictPlugin?.name ?? conflict;
        const reason =
          plugin.conflictReasons?.[conflict] ??
          conflictPlugin?.conflictReasons?.[id] ??
          `${plugin.name} and ${conflictName} conflict with each other.`;
        issues.push({
          type: "conflict",
          plugin: id,
          related: conflict,
          message: `Cannot add "${plugin.name || id}". Conflicting plugin already installed: "${conflictName}". Reason: ${reason}`,
        });
      }
    }
  }

  // Also check if any already-installed plugin declares a conflict against a newly selected plugin
  for (const installedId of alreadyInstalledList) {
    const installedPlugin = registry.getPlugin(installedId);
    if (!installedPlugin) continue;
    for (const conflict of installedPlugin.conflicts ?? []) {
      if (selectedSet.has(conflict)) {
        const selectedPlugin = registry.getPlugin(conflict);
        const selectedName = selectedPlugin?.name ?? conflict;
        const reason =
          installedPlugin.conflictReasons?.[conflict] ??
          selectedPlugin?.conflictReasons?.[installedId] ??
          `${installedPlugin.name} and ${selectedName} conflict with each other.`;
        // Only add if not already reported
        const alreadyReported = issues.some(
          (i) => i.type === "conflict" && i.plugin === conflict && i.related === installedId,
        );
        if (!alreadyReported) {
          issues.push({
            type: "conflict",
            plugin: conflict,
            related: installedId,
            message: `Cannot add "${selectedName}". Conflicting plugin already installed: "${installedPlugin.name}". Reason: ${reason}`,
          });
        }
      }
    }
  }

  const order = topologicalOrder(selected, registry, issues);

  return { ok: issues.length === 0, issues, order };
}

/**
 * Kahn's algorithm over the `requires` edges, restricted to the selected
 * set. Missing requirements (not selected at all) are already reported by
 * `resolveDependencyGraph` and are simply ignored here as edges, since
 * they don't affect ordering among what *was* selected.
 */
function topologicalOrder(
  selected: PluginId[],
  registry: PluginRegistry,
  issues: DependencyIssue[],
): PluginId[] {
  const selectedSet = new Set(selected);
  const inDegree = new Map<PluginId, number>();
  const dependents = new Map<PluginId, PluginId[]>();

  for (const id of selected) {
    inDegree.set(id, 0);
    dependents.set(id, []);
  }

  for (const id of selected) {
    const plugin = registry.getPlugin(id);
    if (!plugin) continue;
    for (const requirement of plugin.requires ?? []) {
      if (!selectedSet.has(requirement)) continue; // reported separately
      dependents.get(requirement)?.push(id);
      inDegree.set(id, (inDegree.get(id) ?? 0) + 1);
    }
  }

  const queue = selected.filter((id) => (inDegree.get(id) ?? 0) === 0);
  const order: PluginId[] = [];

  while (queue.length) {
    const id = queue.shift() as PluginId;
    order.push(id);
    for (const dependent of dependents.get(id) ?? []) {
      const next = (inDegree.get(dependent) ?? 0) - 1;
      inDegree.set(dependent, next);
      if (next === 0) queue.push(dependent);
    }
  }

  if (order.length < selected.length) {
    const remaining = selected.filter((id) => !order.includes(id));
    for (const id of remaining) {
      issues.push({
        type: "cycle",
        plugin: id,
        message: `Plugin "${registry.getPlugin(id)?.name ?? id}" is part of a "requires" cycle.`,
      });
    }
    order.push(...remaining);
  }

  return order;
}