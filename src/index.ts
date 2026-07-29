import { devCommand, installCommand } from "@nova/core";
import * as p from "@clack/prompts";
import { execa } from "execa";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";

import { generateProject } from "./generator.js";
import { collectAnswers } from "./prompts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readPackageVersion(): string {
  try {
    // dist/index.js -> ../package.json resolves correctly both in the repo
    // (tsup output at ./dist) and once installed globally from npm.
    const pkgPath = path.join(__dirname, "..", "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function printHelp() {
  console.log(`
${pc.bold("nova")} - scaffold a production-ready Next.js app

${pc.bold("Usage")}
  nova [project-name] [options]

${pc.bold("Options")}
  -h, --help       Show this help message
  -v, --version    Print the installed version

${pc.bold("Examples")}
  nova my-app
  nova
`);
}

export async function run() {
  const args = process.argv.slice(2);

  if (args.includes("-h") || args.includes("--help")) {
    printHelp();
    return;
  }

  if (args.includes("-v") || args.includes("--version")) {
    console.log(readPackageVersion());
    return;
  }

  const firstArg = args[0];

  if (firstArg?.startsWith("-")) {
    console.error(`Unknown option: ${firstArg}\n`);
    printHelp();
    process.exitCode = 1;
    return;
  }

  const cliProjectName = firstArg;

  const answers = await collectAnswers(cliProjectName);

  const spinner = p.spinner();
  spinner.start("Generating project");

  let result;
  try {
    result = await generateProject(answers, {
      onStep: (step) => spinner.message(step),
    });
  } catch (error) {
    spinner.stop("Generation failed", 1);
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  spinner.stop("Project files generated");

  if (answers.initGit) {
    try {
      await execa("git", ["init"], { cwd: result.targetDir });
      await execa("git", ["add", "-A"], { cwd: result.targetDir });
      await execa("git", ["commit", "-m", "chore: initial commit from nova"], {
        cwd: result.targetDir,
      });
      p.log.success("Initialized git repository");
    } catch {
      p.log.warn("Could not initialize git automatically (is git installed?)");
    }
  }

  if (answers.installNow) {
    const installSpinner = p.spinner();
    installSpinner.start(`Installing dependencies with ${answers.packageManager}`);
    try {
      await execa(answers.packageManager, ["install"], { cwd: result.targetDir });
      installSpinner.stop("Dependencies installed");
    } catch (error) {
      installSpinner.stop("Dependency installation failed", 1);
      p.log.error(error instanceof Error ? error.message : String(error));
      p.log.warn(
        `Run "${installCommand(answers.packageManager)}" manually inside ${answers.projectName}.`,
      );
    }
  }

  p.outro(pc.green("Done!"));

  console.log("");
  console.log(pc.bold("Next steps:"));
  console.log(`  cd ${answers.projectName}`);
  console.log(`  cp .env.example .env   ${pc.dim("# fill in real values")}`);
  if (!answers.installNow) console.log(`  ${installCommand(answers.packageManager)}`);
  console.log(`  ${devCommand(answers.packageManager)}`);
  console.log("");
  console.log(pc.dim("See docs/folder-structure.md to get oriented."));
}