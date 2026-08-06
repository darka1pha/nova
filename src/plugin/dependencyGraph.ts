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

/**
 * Validates a selected set of plugin ids against a registry:
 *  - every id must resolve to a registered plugin,
 *  - every declared `requires` must also be in the selection,
 *  - no two mutually `conflicts`-ing plugins may both be selected,
 *  - the `requires` graph (restricted to the selection) must be acyclic.
 *
 * Returns every issue found (not just the first) plus a topological
 * ordering of the selection, suitable for driving hook/patch/template
 * execution order so a plugin's dependency is always applied first.
 */
export function resolveDependencyGraph(
  selected: PluginId[],
  registry: PluginRegistry,
): DependencyGraphResult {
  const issues: DependencyIssue[] = [];
  const selectedSet = new Set(selected);

  for (const id of selected) {
    const plugin = registry.getPlugin(id);
    if (!plugin) {
      issues.push({ type: "unknown-plugin", plugin: id, message: `Unknown plugin: "${id}".` });
      continue;
    }

    for (const requirement of plugin.requires ?? []) {
      if (!selectedSet.has(requirement)) {
        issues.push({
          type: "missing-requirement",
          plugin: id,
          related: requirement,
          message: `Plugin "${plugin.name}" requires "${registry.getPlugin(requirement)?.name ?? requirement
            }" to also be enabled.`,
        });
      }
    }

    for (const conflict of plugin.conflicts ?? []) {
      if (selectedSet.has(conflict)) {
        issues.push({
          type: "conflict",
          plugin: id,
          related: conflict,
          message: `Plugin "${plugin.name}" conflicts with "${registry.getPlugin(conflict)?.name ?? conflict
            }". Disable one of them.`,
        });
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