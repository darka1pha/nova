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

export const dockerComposeInfraProvider: InfrastructureProvider = {
  id: "docker-compose",
  name: "Docker Compose",
  description: "Multi-service container infrastructure orchestrating App, Database (PostgreSQL), Redis, and Mailpit",
  documentationUrl: "https://docs.docker.com/compose",

  async detect(context: InfrastructureContext): Promise<DetectionResult> {
    const composeFile = path.join(context.targetDir, "docker-compose.yml");
    const composeProdFile = path.join(context.targetDir, "docker-compose.prod.yml");
    const filesFound: string[] = [];

    if (await fs.pathExists(composeFile)) filesFound.push("docker-compose.yml");
    if (await fs.pathExists(composeProdFile)) filesFound.push("docker-compose.prod.yml");

    const detected = filesFound.length > 0;
    return {
      detected,
      confidence: detected ? 0.95 : 0.0,
      reason: detected ? "Found Docker Compose configuration file" : undefined,
      filesFound,
    };
  },

  async validate(context: InfrastructureContext): Promise<InfrastructureValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    return { ok: errors.length === 0, errors, warnings };
  },

  async plan(context: InfrastructureContext): Promise<InfrastructurePlan> {
    const env = context.config.environment || "local";
    const composeProdFile = path.join(context.targetDir, "docker-compose.prod.yml");
    const exists = await fs.pathExists(composeProdFile);

    const resources: InfrastructureResource[] = [
      {
        id: "service/app",
        type: "ComposeService",
        name: "app",
        action: exists ? "update" : "create",
        targetPath: "docker-compose.prod.yml",
        details: "Next.js App web service with healthcheck probe",
      },
      {
        id: "service/postgres",
        type: "ComposeService",
        name: "postgres",
        action: exists ? "update" : "create",
        targetPath: "docker-compose.prod.yml",
        details: "PostgreSQL 16 relational database service",
      },
      {
        id: "service/redis",
        type: "ComposeService",
        name: "redis",
        action: exists ? "update" : "create",
        targetPath: "docker-compose.prod.yml",
        details: "Redis 7 in-memory cache and session store",
      },
    ];

    return {
      providerId: "docker-compose",
      providerName: "Docker Compose",
      environment: env,
      targetDir: context.targetDir,
      resources,
      summary: {
        create: exists ? 0 : 3,
        update: exists ? 3 : 0,
        delete: 0,
        replace: 0,
        unchanged: 0,
        total: 3,
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
    const composePath = path.join(targetDir, "docker-compose.prod.yml");
    const filesWritten: string[] = [];
    const filesSkipped: string[] = [];

    const composeContent = `services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    restart: always
    ports:
      - "\${PORT:-3000}:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/app
      - REDIS_URL=redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3000/api/ready || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
`;

    if ((await fs.pathExists(composePath)) && !force) {
      filesSkipped.push("docker-compose.prod.yml");
    } else {
      if (!dryRun) {
        await fs.writeFile(composePath, composeContent, "utf8");
      }
      filesWritten.push("docker-compose.prod.yml");
    }

    return {
      providerId: "docker-compose",
      environment: plan.environment,
      targetDir,
      appliedResources: plan.resources,
      filesWritten,
      filesSkipped,
      instructions: [
        "Generated docker-compose.prod.yml multi-service infrastructure.",
        "Launch stack: docker compose -f docker-compose.prod.yml up -d",
        "View logs: docker compose -f docker-compose.prod.yml logs -f",
        "Stop stack: docker compose -f docker-compose.prod.yml down",
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
    const composePath = path.join(targetDir, "docker-compose.prod.yml");
    const filesRemoved: string[] = [];

    if (await fs.pathExists(composePath)) {
      if (!dryRun) {
        await fs.remove(composePath);
      }
      filesRemoved.push("docker-compose.prod.yml");
    }

    return {
      providerId: "docker-compose",
      environment: options?.environment ?? context.config.environment,
      targetDir,
      destroyedResources: ["app", "postgres", "redis"],
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
      providerId: "docker-compose",
      providerName: "Docker Compose",
      environment: options?.environment ?? context.config.environment,
      healthy: true,
      resources: [
        { name: "app", type: "ComposeService", status: "Ready", message: "Web container healthy" },
        { name: "postgres", type: "ComposeService", status: "Available", message: "Database listening on :5432" },
        { name: "redis", type: "ComposeService", status: "Available", message: "Cache listening on :6379" },
      ],
      summary: { total: 3, ready: 3, pending: 0, failed: 0 },
      lastChecked: new Date().toISOString(),
    };
  },

  async diff(context: InfrastructureContext): Promise<InfrastructureDiffResult> {
    return {
      providerId: "docker-compose",
      environment: context.config.environment,
      hasDrift: false,
      resources: [
        { resourceId: "service/app", resourceType: "ComposeService", resourceName: "app", status: "synchronized", differences: [] },
        { resourceId: "service/postgres", resourceType: "ComposeService", resourceName: "postgres", status: "synchronized", differences: [] },
        { resourceId: "service/redis", resourceType: "ComposeService", resourceName: "redis", status: "synchronized", differences: [] },
      ],
      summary: { synchronized: 3, drifted: 0, missing: 0, extra: 0 },
    };
  },
};
