import pc from "picocolors";
import { validateTemplateSystem } from "../src/templates/validator.js";

async function main() {
  console.log(pc.bold("\nValidating Nova Template & Preset Ecosystem...\n"));

  const summary = await validateTemplateSystem();

  if (summary.valid) {
    console.log(
      pc.green(
        `✓ All ${summary.templatesCount} templates, ${summary.presetsCount} presets, and ${summary.featuresCount} features passed comprehensive validation.`,
      ),
    );
    console.log("");
    return;
  }

  console.error(pc.red(`✗ Found ${summary.errors.length} template validation error(s):\n`));
  for (const err of summary.errors) {
    const target = err.templateId ? `[Template: ${err.templateId}]` : err.presetId ? `[Preset: ${err.presetId}]` : err.feature ? `[Feature: ${err.feature}]` : "[General]";
    console.error(`  ${pc.yellow(target)} ${err.message}`);
  }
  console.error("");

  process.exitCode = 1;
}

main();
