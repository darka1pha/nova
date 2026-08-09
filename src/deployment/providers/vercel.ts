import fs from "fs-extra";
import path from "node:path";

import type { DeploymentConfigOptions, DeploymentProvider, DeploymentResult } from "../types.js";

export const vercelProvider: DeploymentProvider = {
  id: "vercel",
  name: "Vercel",
  description: "Native zero-config deployment for Next.js with Edge Network and Serverless Functions",
  documentationUrl: "https://vercel.com/docs",

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

    // 1. vercel.json
    const vercelConfig = {
      $schema: "https://openapi.vercel.sh/vercel.json",
      framework: "nextjs",
      buildCommand: "next build",
      devCommand: "next dev --turbopack",
      installCommand: "npm install",
      cleanUrls: true,
      headers: [
        {
          source: "/(.*)",
          headers: [
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "X-Frame-Options", value: "DENY" },
            { key: "X-XSS-Protection", value: "1; mode=block" },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          ],
        },
      ],
    };

    const vercelJsonPath = path.join(targetDir, "vercel.json");
    if (!force && (await fs.pathExists(vercelJsonPath))) {
      filesSkipped.push("vercel.json");
    } else {
      await fs.writeJson(vercelJsonPath, vercelConfig, { spaces: 2 });
      filesWritten.push("vercel.json");
    }

    // 2. .github/workflows/deploy-vercel.yml
    const workflowDir = path.join(targetDir, ".github", "workflows");
    await fs.ensureDir(workflowDir);
    const workflowPath = path.join(workflowDir, "deploy-vercel.yml");

    const workflowContent = `name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
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

      - name: Run tests & typecheck
        run: |
          npm run typecheck
          npm test --if-present

      - name: Deploy to Vercel (Preview or Production)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: \${{ github.ref == 'refs/heads/main' && '--prod' || '' }}
`;

    if (!force && (await fs.pathExists(workflowPath))) {
      filesSkipped.push(".github/workflows/deploy-vercel.yml");
    } else {
      await fs.writeFile(workflowPath, workflowContent, "utf8");
      filesWritten.push(".github/workflows/deploy-vercel.yml");
    }

    // 3. docs/deployment/vercel.md
    const docsDir = path.join(targetDir, "docs", "deployment");
    await fs.ensureDir(docsDir);
    const docsPath = path.join(docsDir, "vercel.md");

    const docsContent = `# Vercel Deployment Guide

This project is configured for automated deployments with **Vercel**.

## 1. Quick Deploy via Vercel CLI

Install the Vercel CLI globally and run:

\`\`\`bash
npm i -g vercel
vercel login
vercel          # Deploy preview
vercel --prod   # Deploy production
\`\`\`

## 2. GitHub Actions CI/CD Setup

To enable automated PR previews and main branch production deployments:

1. In your Vercel Project Settings, copy:
   - \`VERCEL_ORG_ID\`
   - \`VERCEL_PROJECT_ID\`
2. Generate a Personal Access Token in your Vercel Account Settings (\`VERCEL_TOKEN\`).
3. Add these three values as **Secrets** in your GitHub Repository Settings (\`Settings > Secrets and variables > Actions\`).

## 3. Environment Variables

Ensure all required production environment variables (e.g. database connection strings, auth secrets) are added to your Vercel Project Settings under **Environment Variables**.
`;

    if (!force && (await fs.pathExists(docsPath))) {
      filesSkipped.push("docs/deployment/vercel.md");
    } else {
      await fs.writeFile(docsPath, docsContent, "utf8");
      filesWritten.push("docs/deployment/vercel.md");
    }

    // 4. Update package.json scripts
    const pkgPath = path.join(targetDir, "package.json");
    if (await fs.pathExists(pkgPath)) {
      const pkg = await fs.readJson(pkgPath);
      pkg.scripts = pkg.scripts || {};
      if (!pkg.scripts["deploy:vercel"]) {
        pkg.scripts["deploy:vercel"] = "vercel --prod";
        scriptsAdded.push("deploy:vercel");
      }
      if (!pkg.scripts["deploy:preview"]) {
        pkg.scripts["deploy:preview"] = "vercel";
        scriptsAdded.push("deploy:preview");
      }
      await fs.writeJson(pkgPath, pkg, { spaces: 2 });
    }

    return {
      provider: "vercel",
      providerName: "Vercel",
      targetDir,
      filesWritten,
      filesSkipped,
      scriptsAdded,
      instructions: [
        "Generated vercel.json configuration and GitHub Actions CI/CD workflow.",
        "Run `npx vercel` to link your project or push to GitHub to trigger automated deployments.",
        "See docs/deployment/vercel.md for full credentials and environment variable instructions.",
      ],
    };
  },
};
