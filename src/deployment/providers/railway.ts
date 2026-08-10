import fs from "fs-extra";
import path from "node:path";

import type { DeploymentConfigOptions, DeploymentProvider, DeploymentResult } from "../types.js";

export const railwayProvider: DeploymentProvider = {
  id: "railway",
  name: "Railway",
  description: "Modern cloud platform with instant PostgreSQL/Redis provisioning and automatic builds",
  documentationUrl: "https://docs.railway.app",

  async validate(targetDir: string) {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!(await fs.pathExists(path.join(targetDir, "package.json")))) {
      errors.push("No package.json found in project directory");
    }
    return { ok: errors.length === 0, errors, warnings };
  },

  async generateConfig(options: DeploymentConfigOptions): Promise<DeploymentResult> {
    const { targetDir, force = false, dryRun = false } = options;
    const filesWritten: string[] = [];
    const filesSkipped: string[] = [];
    const scriptsAdded: string[] = [];

    // 1. railway.json
    const railwayConfig = {
      $schema: "https://railway.app/railway.schema.json",
      build: {
        builder: "NIXPACKS",
        buildCommand: "npm run build",
      },
      deploy: {
        startCommand: "npm run start",
        healthcheckPath: "/api/ready",
        healthcheckTimeout: 120,
        restartPolicyType: "ON_FAILURE",
        restartPolicyMaxRetries: 5,
      },
    };

    const railwayJsonPath = path.join(targetDir, "railway.json");
    if (!force && (await fs.pathExists(railwayJsonPath))) {
      filesSkipped.push("railway.json");
    } else {
      if (!dryRun) {
        await fs.writeJson(railwayJsonPath, railwayConfig, { spaces: 2 });
      }
      filesWritten.push("railway.json");
    }

    // 2. docs/deployment/railway.md
    const docsDir = path.join(targetDir, "docs", "deployment");
    const docsPath = path.join(docsDir, "railway.md");

    const docsContent = `# Railway Deployment Guide

This project is configured for **Railway** deployment.

## 1. Deploy with Railway CLI

\`\`\`bash
npm i -g @railway/cli
railway login
railway init
railway up
\`\`\`

## 2. Environment & Database Provisioning

- In your Railway dashboard, add PostgreSQL / Redis plugins with 1 click.
- Railway will inject \`DATABASE_URL\` and \`REDIS_URL\` directly into your container environment.
`;

    if (!force && (await fs.pathExists(docsPath))) {
      filesSkipped.push("docs/deployment/railway.md");
    } else {
      if (!dryRun) {
        await fs.ensureDir(docsDir);
        await fs.writeFile(docsPath, docsContent, "utf8");
      }
      filesWritten.push("docs/deployment/railway.md");
    }

    // 3. Update package.json scripts
    const pkgPath = path.join(targetDir, "package.json");
    if (await fs.pathExists(pkgPath)) {
      const pkg = await fs.readJson(pkgPath);
      pkg.scripts = pkg.scripts || {};
      if (!pkg.scripts["deploy:railway"]) {
        pkg.scripts["deploy:railway"] = "railway up";
        scriptsAdded.push("deploy:railway");
      }
      if (!dryRun) {
        await fs.writeJson(pkgPath, pkg, { spaces: 2 });
      }
    }

    return {
      provider: "railway",
      providerName: "Railway",
      targetDir,
      filesWritten,
      filesSkipped,
      scriptsAdded,
      dryRun,
      instructions: [
        "Generated railway.json configuration file.",
        "Use `railway up` or connect your GitHub repository in the Railway dashboard.",
        "See docs/deployment/railway.md for instructions.",
      ],
    };
  },
};
