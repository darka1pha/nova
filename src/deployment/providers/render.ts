import fs from "fs-extra";
import path from "node:path";

import type { DeploymentConfigOptions, DeploymentProvider, DeploymentResult } from "../types.js";

export const renderProvider: DeploymentProvider = {
  id: "render",
  name: "Render",
  description: "Unified cloud platform for web services, background workers, and managed databases",
  documentationUrl: "https://render.com/docs",

  async validate(targetDir: string) {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!(await fs.pathExists(path.join(targetDir, "package.json")))) {
      errors.push("No package.json found in project directory");
    }
    return { ok: errors.length === 0, errors, warnings };
  },

  async generateConfig(options: DeploymentConfigOptions): Promise<DeploymentResult> {
    const { targetDir, force = false } = options;
    const filesWritten: string[] = [];
    const filesSkipped: string[] = [];
    const scriptsAdded: string[] = [];

    // 1. render.yaml
    const renderYaml = `services:
  - type: web
    name: nova-app
    runtime: node
    plan: starter
    buildCommand: npm ci && npm run build
    startCommand: npm run start
    healthCheckPath: /api/ready
    envVars:
      - key: NODE_VERSION
        value: 20.0.0
      - key: PORT
        value: 3000
`;

    const renderYamlPath = path.join(targetDir, "render.yaml");
    if (!force && (await fs.pathExists(renderYamlPath))) {
      filesSkipped.push("render.yaml");
    } else {
      await fs.writeFile(renderYamlPath, renderYaml, "utf8");
      filesWritten.push("render.yaml");
    }

    // 2. docs/deployment/render.md
    const docsDir = path.join(targetDir, "docs", "deployment");
    await fs.ensureDir(docsDir);
    const docsPath = path.join(docsDir, "render.md");

    const docsContent = `# Render Deployment Guide

This project is configured with a **Render Blueprint** (\`render.yaml\`).

## 1. Blueprint Deployment

1. Push your repository to GitHub.
2. In the Render Dashboard, click **New > Blueprint**.
3. Select your repository. Render will automatically parse \`render.yaml\` and create the web service.

## 2. Environment Variables

Configure sensitive variables (database credentials, auth secrets) in the Render Dashboard under **Environment Variables**.
`;

    if (!force && (await fs.pathExists(docsPath))) {
      filesSkipped.push("docs/deployment/render.md");
    } else {
      await fs.writeFile(docsPath, docsContent, "utf8");
      filesWritten.push("docs/deployment/render.md");
    }

    return {
      provider: "render",
      providerName: "Render",
      targetDir,
      filesWritten,
      filesSkipped,
      scriptsAdded,
      instructions: [
        "Generated render.yaml Infrastructure-as-Code blueprint.",
        "Link your GitHub repo in Render to deploy automatically.",
        "See docs/deployment/render.md for setup guide.",
      ],
    };
  },
};
