import fs from "fs-extra";
import path from "node:path";

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
    const { targetDir, force = false } = options;
    const filesWritten: string[] = [];
    const filesSkipped: string[] = [];
    const scriptsAdded: string[] = [];

    // 1. Dockerfile.prod
    const dockerfileContent = `FROM node:20-alpine AS base

# Step 1. Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Step 2. Production image, copy all the files and run next
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
      await fs.writeFile(dockerfilePath, dockerfileContent, "utf8");
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
      test: ["CMD-SHELL", "wget -qO- http://localhost:3000/api/ready || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
`;

    const composePath = path.join(targetDir, "docker-compose.prod.yml");
    if (!force && (await fs.pathExists(composePath))) {
      filesSkipped.push("docker-compose.prod.yml");
    } else {
      await fs.writeFile(composePath, composeContent, "utf8");
      filesWritten.push("docker-compose.prod.yml");
    }

    // 3. docs/deployment/self-hosted.md
    const docsDir = path.join(targetDir, "docs", "deployment");
    await fs.ensureDir(docsDir);
    const docsPath = path.join(docsDir, "self-hosted.md");

    const docsContent = `# Self-Hosted Docker Deployment Guide

This project includes a production-ready **multi-stage standalone Docker build**.

## 1. Running with Docker Compose

\`\`\`bash
docker compose -f docker-compose.prod.yml up --build -d
\`\`\`

## 2. Production Checklist

- Ensure \`output: "standalone"\` is enabled in \`next.config.mjs\` (Nova base template includes this by default).
- Set up a reverse proxy (e.g. Nginx, Caddy, Traefik) to manage SSL certificates with Let's Encrypt.
`;

    if (!force && (await fs.pathExists(docsPath))) {
      filesSkipped.push("docs/deployment/self-hosted.md");
    } else {
      await fs.writeFile(docsPath, docsContent, "utf8");
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
      await fs.writeJson(pkgPath, pkg, { spaces: 2 });
    }

    return {
      provider: "docker",
      providerName: "Docker & Self-Hosted",
      targetDir,
      filesWritten,
      filesSkipped,
      scriptsAdded,
      instructions: [
        "Generated Dockerfile.prod and docker-compose.prod.yml.",
        "Run `npm run docker:prod` or `docker compose -f docker-compose.prod.yml up -d` to launch.",
        "See docs/deployment/self-hosted.md for production proxy and SSL guidance.",
      ],
    };
  },
};
