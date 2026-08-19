import pc from "picocolors";
import { getTemplate, listTemplates, resolveTemplate } from "../templates/registry.js";
import { listPresets } from "../presets/registry.js";

export async function runTemplateSubcommand(args: string[]): Promise<void> {
  let command = args[0];
  let rest = args.slice(1);
  const json = rest.includes("--json") || args.includes("--json");
  const filtered = rest.filter((a) => a !== "--json");

  if (!command || command === "list") {
    const templates = listTemplates();
    if (json) {
      console.log(JSON.stringify(templates, null, 2));
      return;
    }

    console.log(pc.bold("\nAvailable Nova Templates:\n"));
    for (const t of templates) {
      const aliasText = t.aliases?.length ? ` (aliases: ${t.aliases.join(", ")})` : "";
      console.log(`  ${pc.cyan(t.id.padEnd(14))} ${pc.bold(t.name)}${pc.dim(aliasText)}`);
      console.log(`    ${pc.dim(t.description)}`);
      if (t.category) {
        console.log(`    ${pc.dim("Category:")} ${t.category}`);
      }
      if (t.presetId) {
        console.log(`    ${pc.dim("Preset:")}   ${t.presetId}`);
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
    if (tpl.category) {
      console.log(`  ${pc.dim("Category:")}        ${tpl.category}`);
    }
    console.log(`  ${pc.dim("Default UI:")}      ${tpl.defaultUiLibrary ?? "shadcn"}`);
    if (tpl.presetId) {
      console.log(`  ${pc.dim("Preset:")}          ${tpl.presetId}`);
    }
    if (tpl.aliases?.length) {
      console.log(`  ${pc.dim("Aliases:")}         ${tpl.aliases.join(", ")}`);
    }
    if (tpl.features?.length) {
      console.log(`  ${pc.dim("Features:")}`);
      for (const feat of tpl.features) {
        console.log(`    ${pc.green("✓")} ${feat}`);
      }
    }
    console.log(`  ${pc.dim("Composed Plugins:")} ${resolution.resolvedPlugins.join(", ") || "none"}`);
    if (tpl.compatibility) {
      console.log(`  ${pc.dim("Compatibility:")}    Node ${tpl.compatibility.node ?? "*"}, Next.js ${tpl.compatibility.next ?? "*"}`);
    }
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
      if (p.category) {
        console.log(`    ${pc.dim("Category:")} ${p.category}`);
      }
      console.log(`    ${pc.dim("Plugins:")}  ${p.plugins.join(", ")}`);
      console.log("");
    }
    return;
  }

  // If user typed "nova templates <name>" directly (shorthand for info)
  const maybeTpl = getTemplate(command);
  if (maybeTpl) {
    return runTemplateSubcommand(["info", command, ...rest]);
  }

  throw new Error(`Unknown template command: "${command}". Use: list, info, presets`);
}
