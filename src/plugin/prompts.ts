import { bail } from "@nova/core";
import * as p from "@clack/prompts";

import type { PluginRegistry } from "./registry.js";
import type { PluginAnswers, PluginId, PromptDefinition } from "./types.js";

async function runPrompt(prompt: PromptDefinition): Promise<unknown> {
  switch (prompt.type) {
    case "select": {
      const result = await p.select({
        message: prompt.message,
        options: prompt.options.map((option) => ({
          value: option.value,
          label: option.label,
          hint: option.hint,
        })),
        initialValue: prompt.default,
      });
      bail(result);
      return result;
    }

    case "confirm": {
      const result = await p.confirm({
        message: prompt.message,
        initialValue: prompt.default ?? true,
      });
      bail(result);
      return result;
    }

    case "multiselect": {
      const result = await p.multiselect({
        message: prompt.message,
        options: prompt.options.map((option) => ({
          value: option.value,
          label: option.label,
          hint: option.hint,
        })),
        required: false,
      });
      bail(result);
      return result;
    }

    case "text": {
      const result = await p.text({
        message: prompt.message,
        initialValue: prompt.default,
        validate: prompt.validate,
      });
      bail(result);
      return result;
    }

    default: {
      const exhaustive: never = prompt;
      throw new Error(`Unknown prompt type: ${JSON.stringify(exhaustive)}`);
    }
  }
}

/**
 * Runs each selected plugin's own `prompts` (in selection order) and
 * collects the answers keyed by plugin id, then by prompt name. Plugins
 * with no `prompts` array (every Phase 1 addon by default, via the legacy
 * adapter) are skipped entirely - the generator never hardcodes
 * plugin-specific questions, and a plugin that doesn't ask anything adds
 * no extra steps to the interactive flow.
 *
 * Cancellation during any individual prompt exits the process via `bail`,
 * matching the behavior of every other clack prompt in `src/prompts.ts`.
 */
export async function runPluginPrompts(
  selected: PluginId[],
  registry: PluginRegistry,
): Promise<PluginAnswers> {
  const answers: PluginAnswers = {};

  for (const id of selected) {
    const plugin = registry.getPlugin(id);
    if (!plugin?.prompts?.length) continue;

    const pluginAnswers: Record<string, unknown> = {};
    for (const prompt of plugin.prompts) {
      pluginAnswers[prompt.name] = await runPrompt(prompt);
    }
    answers[id] = pluginAnswers;
  }

  return answers;
}