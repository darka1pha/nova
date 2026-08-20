import fs from "fs-extra";
import path from "node:path";
import { NOVA_DIR } from "../project.js";
import type {
  InfrastructureConfig,
  InfrastructureEnvironment,
  InfrastructureProfile,
  InfrastructureProviderId,
} from "./types.js";

export const NOVA_INFRASTRUCTURE_FILE = path.join(NOVA_DIR, "infrastructure.json");

export const INFRASTRUCTURE_PROFILES: Record<InfrastructureProfile["id"], InfrastructureProfile> = {
  minimal: {
    id: "minimal",
    name: "Minimal Profile",
    description: "Lean single-instance configuration suitable for local experimentation and micro-services",
    replicas: 1,
    resources: {
      requests: { cpu: "100m", memory: "128Mi" },
      limits: { cpu: "500m", memory: "256Mi" },
    },
    probes: {
      readiness: true,
      liveness: false,
      startup: false,
    },
    rollingUpdate: {
      maxSurge: 1,
      maxUnavailable: 0,
    },
    security: {
      runAsNonRoot: true,
      readOnlyRootFilesystem: false,
      dropCapabilities: ["ALL"],
      allowPrivilegeEscalation: false,
    },
  },
  standard: {
    id: "standard",
    name: "Standard Profile",
    description: "Dual-replica configuration with readiness and liveness health probes",
    replicas: 2,
    resources: {
      requests: { cpu: "250m", memory: "256Mi" },
      limits: { cpu: "1000m", memory: "512Mi" },
    },
    probes: {
      readiness: true,
      liveness: true,
      startup: false,
    },
    rollingUpdate: {
      maxSurge: "25%",
      maxUnavailable: "25%",
    },
    security: {
      runAsNonRoot: true,
      readOnlyRootFilesystem: true,
      dropCapabilities: ["ALL"],
      allowPrivilegeEscalation: false,
    },
  },
  production: {
    id: "production",
    name: "Production Profile",
    description: "High-reliability profile with 3 replicas, full health probes, Horizontal Pod Autoscaling (HPA), and strict security context",
    replicas: 3,
    resources: {
      requests: { cpu: "500m", memory: "512Mi" },
      limits: { cpu: "2000m", memory: "1Gi" },
    },
    probes: {
      readiness: true,
      liveness: true,
      startup: true,
    },
    autoscaling: {
      enabled: true,
      minReplicas: 2,
      maxReplicas: 10,
      targetCPUUtilizationPercentage: 70,
    },
    rollingUpdate: {
      maxSurge: "25%",
      maxUnavailable: 0,
    },
    security: {
      runAsNonRoot: true,
      readOnlyRootFilesystem: true,
      dropCapabilities: ["ALL"],
      allowPrivilegeEscalation: false,
    },
  },
  "high-availability": {
    id: "high-availability",
    name: "High Availability Profile",
    description: "Enterprise HA profile with 5 replicas, aggressive autoscaling, PodDisruptionBudgets, and zero-downtime rolling guarantees",
    replicas: 5,
    resources: {
      requests: { cpu: "1000m", memory: "1Gi" },
      limits: { cpu: "4000m", memory: "2Gi" },
    },
    probes: {
      readiness: true,
      liveness: true,
      startup: true,
    },
    autoscaling: {
      enabled: true,
      minReplicas: 3,
      maxReplicas: 20,
      targetCPUUtilizationPercentage: 60,
    },
    rollingUpdate: {
      maxSurge: "50%",
      maxUnavailable: 0,
    },
    security: {
      runAsNonRoot: true,
      readOnlyRootFilesystem: true,
      dropCapabilities: ["ALL"],
      allowPrivilegeEscalation: false,
    },
  },
};

export function getInfrastructureProfile(profileId: InfrastructureProfile["id"]): InfrastructureProfile {
  return INFRASTRUCTURE_PROFILES[profileId] ?? INFRASTRUCTURE_PROFILES.standard;
}

export async function readInfrastructureConfig(targetDir: string): Promise<InfrastructureConfig | null> {
  const configPath = path.join(targetDir, NOVA_INFRASTRUCTURE_FILE);
  if (!(await fs.pathExists(configPath))) {
    return null;
  }
  try {
    const data = (await fs.readJson(configPath)) as InfrastructureConfig;
    return data;
  } catch {
    return null;
  }
}

export async function writeInfrastructureConfig(
  targetDir: string,
  config: InfrastructureConfig,
): Promise<void> {
  const configPath = path.join(targetDir, NOVA_INFRASTRUCTURE_FILE);
  await fs.ensureDir(path.dirname(configPath));
  await fs.writeJson(configPath, config, { spaces: 2 });
}

export function createDefaultInfrastructureConfig(options: {
  appName: string;
  provider?: InfrastructureProviderId;
  environment?: InfrastructureEnvironment;
  profile?: InfrastructureProfile["id"];
  namespace?: string;
}): InfrastructureConfig {
  const {
    appName,
    provider = "kubernetes",
    environment = "production",
    profile = environment === "production" ? "production" : "standard",
    namespace = appName.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
  } = options;

  return {
    $schema: "https://nova.dev/schema/infrastructure.json",
    version: 1,
    provider,
    environment,
    profile,
    namespace,
    settings: {
      appName,
      port: 3000,
      healthEndpoint: "/api/ready",
      readinessEndpoint: "/api/ready",
      ingressEnabled: true,
      hpaEnabled: profile === "production" || profile === "high-availability",
      tlsEnabled: true,
    },
    updatedAt: new Date().toISOString(),
  };
}
