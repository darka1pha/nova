import fs from "fs-extra";
import path from "node:path";

import { ensureStandaloneOutput, resolveDeploymentCommands } from "../packageManager.js";
import type { DeploymentConfigOptions, DeploymentProvider, DeploymentResult } from "../types.js";

export const dockerDeploymentProvider: DeploymentProvider = {
  id: "docker",
  name: "Docker & Self-Hosted",
  description: "Production multi-stage Docker container and Docker Compose stack for VPS / Kubernetes",
  documentationUrl: "https://docs.docker.com",

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

    const commands = await resolveDeploymentCommands(targetDir);

    // 0. The image copies .next/standalone, which requires output: "standalone".
    const standalone = await ensureStandaloneOutput(targetDir, dryRun);

    // 1. Dockerfile.prod - installs with whichever lockfile is present.
    const dockerfileContent = `FROM node:20-alpine AS base

# Step 1. Install dependencies with the project's package manager
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* bun.lock* ./
RUN if [ -f pnpm-lock.yaml ]; then corepack enable && pnpm install --frozen-lockfile; \\
  elif [ -f yarn.lock ]; then corepack enable && yarn install --frozen-lockfile; \\
  elif [ -f bun.lock ] || [ -f bun.lockb ]; then npm install -g bun && bun install --frozen-lockfile; \\
  else npm ci; fi

# Step 2. Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# public/ is optional in Next.js but the runner stage copies it.
RUN mkdir -p public && npm run build

# Step 3. Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
`;

    const dockerfilePath = path.join(targetDir, "Dockerfile.prod");
    if (!force && (await fs.pathExists(dockerfilePath))) {
      filesSkipped.push("Dockerfile.prod");
    } else {
      if (!dryRun) {
        await fs.writeFile(dockerfilePath, dockerfileContent, "utf8");
      }
      filesWritten.push("Dockerfile.prod");
    }

    // 2. docker-compose.prod.yml
    const composeContent = `services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3000/api/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
`;

    const composePath = path.join(targetDir, "docker-compose.prod.yml");
    if (!force && (await fs.pathExists(composePath))) {
      filesSkipped.push("docker-compose.prod.yml");
    } else {
      if (!dryRun) {
        await fs.writeFile(composePath, composeContent, "utf8");
      }
      filesWritten.push("docker-compose.prod.yml");
    }

    // 3. docs/deployment/self-hosted.md
    const docsDir = path.join(targetDir, "docs", "deployment");
    const docsPath = path.join(docsDir, "self-hosted.md");

    const docsContent = `# Self-Hosted Docker Deployment Guide

This project includes a production-ready **multi-stage standalone Docker build**.

## 1. Running with Docker Compose

\`\`\`bash
docker compose -f docker-compose.prod.yml up --build -d
\`\`\`

## 2. Production Checklist

- \`output: "standalone"\` must be enabled in \`next.config.mjs\`. \`nova deploy docker\` adds it automatically when it can.
- The Compose healthcheck calls \`/api/health\`, which ships with the Nova base template.
- Set up a reverse proxy (e.g. Nginx, Caddy, Traefik) to manage SSL certificates with Let's Encrypt.
`;

    if (!force && (await fs.pathExists(docsPath))) {
      filesSkipped.push("docs/deployment/self-hosted.md");
    } else {
      if (!dryRun) {
        await fs.ensureDir(docsDir);
        await fs.writeFile(docsPath, docsContent, "utf8");
      }
      filesWritten.push("docs/deployment/self-hosted.md");
    }

    // 4. Update package.json scripts
    const pkgPath = path.join(targetDir, "package.json");
    if (await fs.pathExists(pkgPath)) {
      const pkg = await fs.readJson(pkgPath);
      pkg.scripts = pkg.scripts || {};
      if (!pkg.scripts["docker:build"]) {
        pkg.scripts["docker:build"] = "docker build -f Dockerfile.prod -t app .";
        scriptsAdded.push("docker:build");
      }
      if (!pkg.scripts["docker:prod"]) {
        pkg.scripts["docker:prod"] = "docker compose -f docker-compose.prod.yml up -d";
        scriptsAdded.push("docker:prod");
      }
      if (!dryRun) {
        await fs.writeJson(pkgPath, pkg, { spaces: 2 });
      }
    }

    const instructions = [
      "Generated Dockerfile.prod and docker-compose.prod.yml.",
      `Run \`${commands.run("docker:prod")}\` or \`docker compose -f docker-compose.prod.yml up -d\` to launch.`,
      "See docs/deployment/self-hosted.md for production proxy and SSL guidance.",
    ];

    if (standalone.patched) {
      filesWritten.push(standalone.patched);
      instructions.unshift(`Enabled output: "standalone" in ${standalone.patched}.`);
    } else if (standalone.failed) {
      instructions.unshift(
        'Could not enable output: "standalone" automatically - add it to your next.config before building the image.',
      );
    }

    return {
      provider: "docker",
      providerName: "Docker & Self-Hosted",
      targetDir,
      filesWritten,
      filesSkipped,
      scriptsAdded,
      dryRun,
      instructions,
    };
  },
};
