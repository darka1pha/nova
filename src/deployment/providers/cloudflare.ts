import fs from "fs-extra";
import path from "node:path";

import type { DeploymentConfigOptions, DeploymentProvider, DeploymentResult } from "../types.js";

export const cloudflareProvider: DeploymentProvider = {
  id: "cloudflare",
  name: "Cloudflare Pages & Workers",
  description: "Global Edge deployment with Cloudflare Pages and OpenNext",
  documentationUrl: "https://developers.cloudflare.com/pages",

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

    // 1. wrangler.toml
    const wranglerContent = `name = "nova-app"
compatibility_date = "2024-11-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".next"

[vars]
NODE_VERSION = "20"
`;

    const wranglerPath = path.join(targetDir, "wrangler.toml");
    if (!force && (await fs.pathExists(wranglerPath))) {
      filesSkipped.push("wrangler.toml");
    } else {
      if (!dryRun) {
        await fs.writeFile(wranglerPath, wranglerContent, "utf8");
      }
      filesWritten.push("wrangler.toml");
    }

    // 2. .github/workflows/deploy-cloudflare.yml
    const workflowDir = path.join(targetDir, ".github", "workflows");
    const workflowPath = path.join(workflowDir, "deploy-cloudflare.yml");

    const workflowContent = `name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build Next.js app
        run: npm run build

      - name: Publish to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy .next --project-name=nova-app
`;

    if (!force && (await fs.pathExists(workflowPath))) {
      filesSkipped.push(".github/workflows/deploy-cloudflare.yml");
    } else {
      if (!dryRun) {
        await fs.ensureDir(workflowDir);
        await fs.writeFile(workflowPath, workflowContent, "utf8");
      }
      filesWritten.push(".github/workflows/deploy-cloudflare.yml");
    }

    // 3. docs/deployment/cloudflare.md
    const docsDir = path.join(targetDir, "docs", "deployment");
    const docsPath = path.join(docsDir, "cloudflare.md");

    const docsContent = `# Cloudflare Pages Deployment Guide

This project is configured for **Cloudflare Pages**.

## 1. Quick Deploy via Wrangler CLI

\`\`\`bash
npm i -g wrangler
wrangler login
npm run build
wrangler pages deploy .next --project-name=nova-app
\`\`\`

## 2. Automated GitHub Actions CI/CD

Add secrets in your GitHub repository:
- \`CLOUDFLARE_API_TOKEN\`
- \`CLOUDFLARE_ACCOUNT_ID\`
`;

    if (!force && (await fs.pathExists(docsPath))) {
      filesSkipped.push("docs/deployment/cloudflare.md");
    } else {
      if (!dryRun) {
        await fs.ensureDir(docsDir);
        await fs.writeFile(docsPath, docsContent, "utf8");
      }
      filesWritten.push("docs/deployment/cloudflare.md");
    }

    // 4. Update package.json scripts
    const pkgPath = path.join(targetDir, "package.json");
    if (await fs.pathExists(pkgPath)) {
      const pkg = await fs.readJson(pkgPath);
      pkg.scripts = pkg.scripts || {};
      if (!pkg.scripts["deploy:cloudflare"]) {
        pkg.scripts["deploy:cloudflare"] = "wrangler pages deploy .next";
        scriptsAdded.push("deploy:cloudflare");
      }
      if (!dryRun) {
        await fs.writeJson(pkgPath, pkg, { spaces: 2 });
      }
    }

    return {
      provider: "cloudflare",
      providerName: "Cloudflare Pages & Workers",
      targetDir,
      filesWritten,
      filesSkipped,
      scriptsAdded,
      instructions: [
        "Generated wrangler.toml and GitHub Actions workflow for Cloudflare Pages.",
        "Ensure CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are configured in your repository secrets.",
        "See docs/deployment/cloudflare.md for setup instructions.",
      ],
    };
  },
};
