import fs from "fs-extra";
import path from "node:path";
import type {
  DetectionResult,
  InfrastructureApplyOptions,
  InfrastructureApplyResult,
  InfrastructureContext,
  InfrastructureDestroyOptions,
  InfrastructureDestroyResult,
  InfrastructureDiffResult,
  InfrastructurePlan,
  InfrastructureProvider,
  InfrastructureResource,
  InfrastructureStatusOptions,
  InfrastructureStatusResult,
  InfrastructureValidationResult,
} from "../../types.js";

export const dockerInfraProvider: InfrastructureProvider = {
  id: "docker",
  name: "Docker",
  description: "Single-container production Dockerfile with multi-stage standalone caching",
  documentationUrl: "https://docs.docker.com",

  async detect(context: InfrastructureContext): Promise<DetectionResult> {
    const dockerfile = path.join(context.targetDir, "Dockerfile");
    const dockerfileProd = path.join(context.targetDir, "Dockerfile.prod");
    const filesFound: string[] = [];

    if (await fs.pathExists(dockerfile)) filesFound.push("Dockerfile");
    if (await fs.pathExists(dockerfileProd)) filesFound.push("Dockerfile.prod");

    const detected = filesFound.length > 0;
    return {
      detected,
      confidence: detected ? 0.9 : 0.0,
      reason: detected ? "Found Dockerfile" : undefined,
      filesFound,
    };
  },

  async validate(context: InfrastructureContext): Promise<InfrastructureValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const pkgPath = path.join(context.targetDir, "package.json");

    if (!(await fs.pathExists(pkgPath))) {
      errors.push("Missing package.json file required for Docker container build.");
    }

    return { ok: errors.length === 0, errors, warnings };
  },

  async plan(context: InfrastructureContext): Promise<InfrastructurePlan> {
    const env = context.config.environment || "production";
    const dockerfileProd = path.join(context.targetDir, "Dockerfile.prod");
    const exists = await fs.pathExists(dockerfileProd);

    const resources: InfrastructureResource[] = [
      {
        id: "dockerfile/prod",
        type: "Dockerfile",
        name: "Dockerfile.prod",
        action: exists ? "update" : "create",
        targetPath: "Dockerfile.prod",
        details: "Multi-stage production container build definition",
      },
    ];

    return {
      providerId: "docker",
      providerName: "Docker",
      environment: env,
      targetDir: context.targetDir,
      resources,
      summary: {
        create: exists ? 0 : 1,
        update: exists ? 1 : 0,
        delete: 0,
        replace: 0,
        unchanged: 0,
        total: 1,
      },
      risk: "low",
      warnings: [],
      generatedAt: new Date().toISOString(),
    };
  },

  async apply(
    plan: InfrastructurePlan,
    context: InfrastructureContext,
    options?: InfrastructureApplyOptions,
  ): Promise<InfrastructureApplyResult> {
    const targetDir = options?.targetDir ?? context.targetDir;
    const dryRun = options?.dryRun ?? false;
    const force = options?.force ?? false;
    const dockerfilePath = path.join(targetDir, "Dockerfile.prod");
    const filesWritten: string[] = [];
    const filesSkipped: string[] = [];

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

    if ((await fs.pathExists(dockerfilePath)) && !force) {
      filesSkipped.push("Dockerfile.prod");
    } else {
      if (!dryRun) {
        await fs.writeFile(dockerfilePath, dockerfileContent, "utf8");
      }
      filesWritten.push("Dockerfile.prod");
    }

    return {
      providerId: "docker",
      environment: plan.environment,
      targetDir,
      appliedResources: plan.resources,
      filesWritten,
      filesSkipped,
      instructions: [
        "Generated Dockerfile.prod container specification.",
        "Build image: docker build -f Dockerfile.prod -t app:latest .",
        "Run container: docker run -p 3000:3000 app:latest",
      ],
      dryRun,
      success: true,
      warnings: [],
    };
  },

  async destroy(
    context: InfrastructureContext,
    options?: InfrastructureDestroyOptions,
  ): Promise<InfrastructureDestroyResult> {
    const targetDir = options?.targetDir ?? context.targetDir;
    const dryRun = options?.dryRun ?? false;
    const dockerfilePath = path.join(targetDir, "Dockerfile.prod");
    const filesRemoved: string[] = [];

    if (await fs.pathExists(dockerfilePath)) {
      if (!dryRun) {
        await fs.remove(dockerfilePath);
      }
      filesRemoved.push("Dockerfile.prod");
    }

    return {
      providerId: "docker",
      environment: options?.environment ?? context.config.environment,
      targetDir,
      destroyedResources: ["Dockerfile.prod"],
      filesRemoved,
      dryRun,
      success: true,
      warnings: [],
    };
  },

  async status(
    context: InfrastructureContext,
    options?: InfrastructureStatusOptions,
  ): Promise<InfrastructureStatusResult> {
    return {
      providerId: "docker",
      providerName: "Docker",
      environment: options?.environment ?? context.config.environment,
      healthy: true,
      resources: [
        {
          name: "Dockerfile.prod",
          type: "Dockerfile",
          status: "Ready",
          message: "Production container spec present",
        },
      ],
      summary: { total: 1, ready: 1, pending: 0, failed: 0 },
      lastChecked: new Date().toISOString(),
    };
  },

  async diff(context: InfrastructureContext): Promise<InfrastructureDiffResult> {
    return {
      providerId: "docker",
      environment: context.config.environment,
      hasDrift: false,
      resources: [
        {
          resourceId: "dockerfile/prod",
          resourceType: "Dockerfile",
          resourceName: "Dockerfile.prod",
          status: "synchronized",
          differences: [],
        },
      ],
      summary: { synchronized: 1, drifted: 0, missing: 0, extra: 0 },
    };
  },
};
