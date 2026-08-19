import fs from "fs-extra";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OFFICIAL_TEMPLATES } from "./official.js";
import { OFFICIAL_PRESETS } from "../presets/official.js";
import { FEATURE_CONTRIBUTIONS } from "../featureContributions.js";
import { PLUGIN_METADATA } from "../generator/pluginMetadata.js";
import { ADDON_FOLDERS } from "../addonRegistry.js";
import { getTemplateRegistry, resolveTemplate } from "./registry.js";
import { getPresetRegistry, resolvePreset } from "../presets/registry.js";
import { resolveTemplatesRoot } from "../generator/templatesRoot.js";
import { collectFeatureRequirements, collectBaseRequirements } from "../resolver/packageRequirements.js";
import { PackageResolver } from "../resolver/index.js";
import type { FeatureKey } from "../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_ROOT = resolveTemplatesRoot(__dirname);

export interface TemplateValidationError {
  templateId?: string;
  presetId?: string;
  feature?: string;
  field?: string;
  message: string;
}

export interface TemplateValidationSummary {
  valid: boolean;
  templatesCount: number;
  presetsCount: number;
  featuresCount: number;
  errors: TemplateValidationError[];
}

export async function validateTemplateSystem(): Promise<TemplateValidationSummary> {
  const errors: TemplateValidationError[] = [];

  // 1. Check for duplicate template IDs
  const seenTemplateIds = new Set<string>();
  for (const tpl of OFFICIAL_TEMPLATES) {
    const lower = tpl.id.toLowerCase();
    if (seenTemplateIds.has(lower)) {
      errors.push({ templateId: tpl.id, field: "id", message: `Duplicate template ID: "${tpl.id}"` });
    }
    seenTemplateIds.add(lower);

    if (!tpl.name || !tpl.name.trim()) {
      errors.push({ templateId: tpl.id, field: "name", message: "Template missing name" });
    }

    if (!tpl.description || !tpl.description.trim()) {
      errors.push({ templateId: tpl.id, field: "description", message: "Template missing description" });
    }

    if (!tpl.category || !tpl.category.trim()) {
      errors.push({ templateId: tpl.id, field: "category", message: "Template missing category" });
    }
  }

  // 2. Check for duplicate preset IDs
  const seenPresetIds = new Set<string>();
  for (const preset of OFFICIAL_PRESETS) {
    const lower = preset.id.toLowerCase();
    if (seenPresetIds.has(lower)) {
      errors.push({ presetId: preset.id, field: "id", message: `Duplicate preset ID: "${preset.id}"` });
    }
    seenPresetIds.add(lower);

    if (!preset.name || !preset.name.trim()) {
      errors.push({ presetId: preset.id, field: "name", message: "Preset missing name" });
    }

    if (!preset.description || !preset.description.trim()) {
      errors.push({ presetId: preset.id, field: "description", message: "Preset missing description" });
    }
  }

  // 3. Validate template preset references and plugin composition
  const templateRegistry = getTemplateRegistry();
  for (const tpl of OFFICIAL_TEMPLATES) {
    if (tpl.presetId) {
      const preset = OFFICIAL_PRESETS.find((p) => p.id === tpl.presetId);
      if (!preset) {
        errors.push({
          templateId: tpl.id,
          field: "presetId",
          message: `Referenced preset "${tpl.presetId}" does not exist in OFFICIAL_PRESETS`,
        });
      }
    }

    const resolution = templateRegistry.resolve(tpl.id);
    if (!resolution.valid) {
      for (const issue of resolution.issues) {
        errors.push({ templateId: tpl.id, message: `Resolution error: ${issue}` });
      }
    }

    // Check for conflicting plugins in resolved template
    const resolvedSet = new Set(resolution.resolvedPlugins);
    for (const pluginKey of resolution.resolvedPlugins) {
      const meta = PLUGIN_METADATA[pluginKey];
      if (meta?.conflicts) {
        for (const conflict of meta.conflicts) {
          if (resolvedSet.has(conflict)) {
            errors.push({
              templateId: tpl.id,
              message: `Conflicting plugins in template: "${pluginKey}" and "${conflict}"`,
            });
          }
        }
      }
    }
  }

  // 4. Validate preset plugin dependencies and conflicts
  const presetRegistry = getPresetRegistry();
  for (const preset of OFFICIAL_PRESETS) {
    const res = presetRegistry.resolve(preset.id);
    if (!res.valid) {
      for (const issue of res.issues) {
        errors.push({ presetId: preset.id, message: `Preset resolution error: ${issue}` });
      }
    }

    const resolvedSet = new Set(res.resolvedPlugins);
    for (const pluginKey of res.resolvedPlugins) {
      const meta = PLUGIN_METADATA[pluginKey];
      if (meta?.conflicts) {
        for (const conflict of meta.conflicts) {
          if (resolvedSet.has(conflict)) {
            errors.push({
              presetId: preset.id,
              message: `Conflicting plugins in preset "${preset.id}": "${pluginKey}" and "${conflict}"`,
            });
          }
        }
      }
    }
  }

  // 5. Validate addon directories exist on disk
  const addonsDir = path.join(TEMPLATES_ROOT, "addons");
  for (const [key, folder] of Object.entries(ADDON_FOLDERS)) {
    const addonPath = path.join(addonsDir, folder);
    if (!(await fs.pathExists(addonPath))) {
      errors.push({
        feature: key,
        message: `Addon folder for feature "${key}" does not exist at "${addonPath}"`,
      });
    }
  }

  // 6. Validate package requirements and offline resolver compatibility
  const offlineResolver = new PackageResolver({ offline: true });
  for (const tpl of OFFICIAL_TEMPLATES) {
    if (tpl.structure === "react-native") continue;
    try {
      const resolution = templateRegistry.resolve(tpl.id);
      const reqs = [
        ...collectBaseRequirements(resolution.uiLibrary),
        ...collectFeatureRequirements(resolution.resolvedPlugins),
      ];
      const res = await offlineResolver.resolvePackages(reqs);
      if (res.failed.length > 0) {
        errors.push({
          templateId: tpl.id,
          message: `Package resolution failed for: ${res.failed.map((f) => f.name).join(", ")}`,
        });
      }
    } catch (err) {
      errors.push({
        templateId: tpl.id,
        message: `Package requirements validation error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    templatesCount: OFFICIAL_TEMPLATES.length,
    presetsCount: OFFICIAL_PRESETS.length,
    featuresCount: Object.keys(FEATURE_CONTRIBUTIONS).length,
    errors,
  };
}
