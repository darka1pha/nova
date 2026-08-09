import { devCommand, installCommand } from "@nova/core";
import fs from "fs-extra";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DirectoryNotEmptyError, InvalidProjectNameError } from "./errors.js";
import { executePlan, rollbackTargetDir, type OperationPlan } from "./operations.js";
import { resolveTemplatesRoot } from "./templatesRoot.js";
import { isValidProjectName } from "../prompts.js";
import { initializeProjectConfig } from "../project.js";
import type { Answers, GenerateProjectOptions } from "../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_ROOT = resolveTemplatesRoot(__dirname);
const MOBILE_TEMPLATE_DIR = path.join(TEMPLATES_ROOT, "mobile", "react-native");

export interface GenerateMobileResult {
  targetDir: string;
}

export async function generateMobileProject(
  answers: Answers,
  options: GenerateProjectOptions = {},
): Promise<GenerateMobileResult> {
  const { onStep, dryRun = false } = options;

  if (!isValidProjectName(answers.projectName)) {
    throw new InvalidProjectNameError(answers.projectName);
  }

  const targetDir = path.resolve(process.cwd(), answers.projectName);

  if (await fs.pathExists(targetDir)) {
    const files = await fs.readdir(targetDir);
    if (files.length > 0) {
      throw new DirectoryNotEmptyError(answers.projectName);
    }
  }

  onStep?.("Scaffolding React Native mobile template");

  const plan: OperationPlan = [
    { type: "mkdir", path: targetDir },
    { type: "copyDir", src: MOBILE_TEMPLATE_DIR, dest: targetDir, label: "react-native-template" },
  ];

  try {
    await executePlan(plan, { dryRun });

    if (dryRun) {
      return { targetDir };
    }

    // Patch package.json
    const pkgPath = path.join(targetDir, "package.json");
    if (await fs.pathExists(pkgPath)) {
      let pkgContent = await fs.readFile(pkgPath, "utf8");
      pkgContent = pkgContent.replaceAll("__PROJECT_NAME__", answers.projectName);
      await fs.writeFile(pkgPath, pkgContent, "utf8");
    }

    // Patch app.json
    const appJsonPath = path.join(targetDir, "app.json");
    if (await fs.pathExists(appJsonPath)) {
      let appJsonContent = await fs.readFile(appJsonPath, "utf8");
      const slug = answers.projectName.toLowerCase().replace(/[^a-z0-9]/g, "-");
      appJsonContent = appJsonContent
        .replaceAll("__PROJECT_NAME__", answers.projectName)
        .replaceAll("__PROJECT_SLUG__", slug);
      await fs.writeFile(appJsonPath, appJsonContent, "utf8");
    }

    // Patch README.md
    const readmePath = path.join(targetDir, "README.md");
    if (await fs.pathExists(readmePath)) {
      let readmeContent = await fs.readFile(readmePath, "utf8");
      readmeContent = readmeContent
        .replaceAll("__PROJECT_NAME__", answers.projectName)
        .replace("__INSTALL_CMD__", installCommand(answers.packageManager))
        .replace("__DEV_CMD__", devCommand(answers.packageManager));
      await fs.writeFile(readmePath, readmeContent, "utf8");
    }

    // Initialize .nova.json metadata
    await initializeProjectConfig(targetDir, [], {
      packageManager: answers.packageManager,
      uiLibrary: "headless",
      projectType: "react-native",
    });

  } catch (error) {
    if (!dryRun) {
      await rollbackTargetDir(targetDir).catch(() => {});
    }
    throw error;
  }

  return { targetDir };
}
