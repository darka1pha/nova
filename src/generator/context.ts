import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Answers, UiLibrary } from "../types.js";
import { createLogger, type Logger } from "./logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// src/generator/context.ts -> ../../templates
const TEMPLATES_ROOT = path.join(__dirname, "..", "..", "templates");

export interface GeneratorPaths {
  readonly templatesRoot: string;
  readonly baseDir: string;
  readonly addonsDir: string;
  readonly uiDir: string;
  readonly targetDir: string;
}

export interface GeneratorContext {
  readonly answers: Answers;
  readonly uiLibrary: UiLibrary;
  readonly paths: GeneratorPaths;
  readonly logger: Logger;
  readonly dryRun: boolean;
  readonly verbose: boolean;
}

export interface BuildContextOptions {
  onStep?: (step: string) => void;
  dryRun?: boolean;
  verbose?: boolean;
}

/**
 * Builds the single, frozen context object threaded through every stage of
 * generation (planning, writing, patching). Nothing downstream mutates
 * global state - everything a step needs (paths, the resolved UI library,
 * the logger, dry-run flag) is read from this object instead of being
 * recomputed or passed around as loose parameters.
 */
export function buildGeneratorContext(
  answers: Answers,
  options: BuildContextOptions = {},
): GeneratorContext {
  const uiLibrary = answers.uiLibrary ?? "shadcn";
  const targetDir = path.resolve(process.cwd(), answers.projectName);

  const paths: GeneratorPaths = Object.freeze({
    templatesRoot: TEMPLATES_ROOT,
    baseDir: path.join(TEMPLATES_ROOT, "base"),
    addonsDir: path.join(TEMPLATES_ROOT, "addons"),
    uiDir: path.join(TEMPLATES_ROOT, "ui"),
    targetDir,
  });

  const logger = createLogger({
    ci: Boolean(process.env.CI),
    verbose: options.verbose,
    onStep: options.onStep,
  });

  return Object.freeze({
    answers,
    uiLibrary,
    paths,
    logger,
    dryRun: options.dryRun ?? false,
    verbose: options.verbose ?? false,
  });
}