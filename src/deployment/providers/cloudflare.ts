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
    const { targetDir, force = false } = options;
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
      await fs.writeFile(wranglerPath, wranglerContent, "utf8");
      filesWritten.push("wrangler.toml");
    }

    // 2. .github/workflows/deploy-cloudflare.yml
    const workflowDir = path.join(targetDir, ".github", "workflows");
    await fs.ensureDir(workflowDir);
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

      - name: Build Next.js
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
      await fs.writeFile(workflowPath, workflowContent, "utf8");
      filesWritten.push(".github/workflows/deploy-cloudflare.yml");
    }

    // 3. docs/deployment/cloudflare.md
    const docsDir = path.join(targetDir, "docs", "deployment");
    await fs.ensureDir(docsDir);
    const docsPath = path.join(docsDir, "cloudflare.md");

    const docsContent = `# Cloudflare Pages Deployment Guide

This project is configured for edge deployments with **Cloudflare Pages**.

## 1. Quick Deploy via Wrangler

\`\`\`bash
npm i -g wrangler
wrangler login
npm run build
wrangler pages deploy .next --project-name=nova-app
\`\`\`

## 2. GitHub Actions CI/CD Setup

1. In your Cloudflare Dashboard, create an API Token with **Cloudflare Pages (Edit)** permissions.
2. Note your **Account ID** from the Cloudflare Dashboard URL or Overview page.
3. In your GitHub repository settings, add:
   - \`CLOUDFLARE_API_TOKEN\`
   - \`CLOUDFLARE_ACCOUNT_ID\`
`;

    if (!force && (await fs.pathExists(docsPath))) {
      filesSkipped.push("docs/deployment/cloudflare.md");
    } else {
      await fs.writeFile(docsPath, docsContent, "utf8");
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
      await fs.writeJson(pkgPath, pkg, { spaces: 2 });
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
