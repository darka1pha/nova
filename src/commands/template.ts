import pc from "picocolors";
import { getTemplate, listTemplates, resolveTemplate } from "../templates/registry.js";
import { listPresets } from "../presets/registry.js";

export async function runTemplateSubcommand(args: string[]): Promise<void> {
  const command = args[0];
  const rest = args.slice(1);
  const json = rest.includes("--json");
  const filtered = rest.filter((a) => a !== "--json");

  if (!command || command === "list") {
    const templates = listTemplates();
    if (json) {
      console.log(JSON.stringify(templates, null, 2));
      return;
    }

    console.log(pc.bold("\nAvailable Nova Templates:\n"));
    for (const t of templates) {
      console.log(`  ${pc.cyan(t.id.padEnd(14))} ${pc.bold(t.name)}`);
      console.log(`    ${pc.dim(t.description)}`);
      if (t.presetId) {
        console.log(`    ${pc.dim("Preset:")} ${t.presetId}`);
      }
      console.log("");
    }
    return;
  }

  if (command === "info") {
    const id = filtered[0];
    if (!id) {
      throw new Error("Usage: nova template info <template-name>");
    }

    const tpl = getTemplate(id);
    if (!tpl) {
      throw new Error(`Template "${id}" not found. Available: ${listTemplates().map((t) => t.id).join(", ")}`);
    }

    const resolution = resolveTemplate(id);

    if (json) {
      console.log(JSON.stringify({ ...tpl, resolution }, null, 2));
      return;
    }

    console.log(pc.bold(`\nTemplate: ${pc.cyan(tpl.name)} (${tpl.id})\n`));
    console.log(`  ${pc.dim("Description:")}     ${tpl.description}`);
    console.log(`  ${pc.dim("Default UI:")}      ${tpl.defaultUiLibrary ?? "shadcn"}`);
    if (tpl.presetId) {
      console.log(`  ${pc.dim("Preset:")}          ${tpl.presetId}`);
    }
    console.log(`  ${pc.dim("Composed Plugins:")} ${resolution.resolvedPlugins.join(", ") || "none"}`);
    console.log("");
    return;
  }

  // Also support preset listing if invoked via template/preset
  if (command === "presets") {
    const presets = listPresets();
    if (json) {
      console.log(JSON.stringify(presets, null, 2));
      return;
    }

    console.log(pc.bold("\nAvailable Nova Presets:\n"));
    for (const p of presets) {
      console.log(`  ${pc.cyan(p.id.padEnd(14))} ${pc.bold(p.name)}`);
      console.log(`    ${pc.dim(p.description)}`);
      console.log(`    ${pc.dim("Plugins:")} ${p.plugins.join(", ")}`);
      console.log("");
    }
    return;
  }

  throw new Error(`Unknown template command: "${command}". Use: list, info, presets`);
}
