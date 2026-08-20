import type { PackageManager, UiLibrary } from "../types.js";

export type InfrastructureEnvironment = "local" | "development" | "staging" | "production";

export type InfrastructureProviderId = "kubernetes" | "terraform" | "docker" | "docker-compose";

export type ResourceAction = "create" | "update" | "delete" | "replace" | "unchanged";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface InfrastructureResource {
  id: string;
  type: string;
  name: string;
  action: ResourceAction;
  targetPath?: string;
  details?: string;
  properties?: Record<string, unknown>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export interface InfrastructurePlan {
  providerId: InfrastructureProviderId;
  providerName: string;
  environment: InfrastructureEnvironment;
  targetDir: string;
  namespace?: string;
  context?: string;
  resources: InfrastructureResource[];
  summary: {
    create: number;
    update: number;
    delete: number;
    replace: number;
    unchanged: number;
    total: number;
  };
  risk: RiskLevel;
  warnings: string[];
  generatedAt: string;
}

export interface InfrastructureApplyOptions {
  targetDir: string;
  environment?: InfrastructureEnvironment;
  namespace?: string;
  context?: string;
  force?: boolean;
  dryRun?: boolean;
  yes?: boolean;
  replicas?: number;
  providerSpecific?: Record<string, unknown>;
}

export interface InfrastructureApplyResult {
  providerId: InfrastructureProviderId;
  environment: InfrastructureEnvironment;
  targetDir: string;
  appliedResources: InfrastructureResource[];
  filesWritten: string[];
  filesSkipped: string[];
  instructions: string[];
  dryRun: boolean;
  success: boolean;
  warnings: string[];
}

export interface InfrastructureDestroyOptions {
  targetDir: string;
  environment?: InfrastructureEnvironment;
  namespace?: string;
  force?: boolean;
  dryRun?: boolean;
  confirmationPhrase?: string;
}

export interface InfrastructureDestroyResult {
  providerId: InfrastructureProviderId;
  environment: InfrastructureEnvironment;
  targetDir: string;
  destroyedResources: string[];
  filesRemoved: string[];
  dryRun: boolean;
  success: boolean;
  warnings: string[];
}

export interface InfrastructureStatusOptions {
  targetDir: string;
  environment?: InfrastructureEnvironment;
  namespace?: string;
}

export interface InfrastructureResourceStatus {
  name: string;
  type: string;
  status: "Ready" | "Available" | "Pending" | "Failed" | "Degraded" | "Unknown";
  message?: string;
  readyReplicas?: number;
  desiredReplicas?: number;
  updatedAt?: string;
}

export interface InfrastructureStatusResult {
  providerId: InfrastructureProviderId;
  providerName: string;
  environment: InfrastructureEnvironment;
  namespace?: string;
  context?: string;
  healthy: boolean;
  resources: InfrastructureResourceStatus[];
  summary: {
    total: number;
    ready: number;
    pending: number;
    failed: number;
  };
  lastChecked: string;
}

export interface ResourceDiff {
  resourceId: string;
  resourceType: string;
  resourceName: string;
  status: "synchronized" | "drifted" | "missing" | "extra";
  differences: Array<{
    field: string;
    desired: unknown;
    actual: unknown;
  }>;
}

export interface InfrastructureDiffResult {
  providerId: InfrastructureProviderId;
  environment: InfrastructureEnvironment;
  hasDrift: boolean;
  resources: ResourceDiff[];
  summary: {
    synchronized: number;
    drifted: number;
    missing: number;
    extra: number;
  };
  remediation?: string;
}

export interface InfrastructureScaleOptions {
  targetDir: string;
  replicas: number;
  environment?: InfrastructureEnvironment;
  namespace?: string;
  dryRun?: boolean;
}

export interface InfrastructureScaleResult {
  providerId: InfrastructureProviderId;
  targetDir: string;
  previousReplicas: number;
  targetReplicas: number;
  dryRun: boolean;
  success: boolean;
  filesModified: string[];
}

export interface InfrastructureSecurityFinding {
  ruleId: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  resourceName: string;
  resourceType: string;
  title: string;
  description: string;
  remediation: string;
}

export interface InfrastructureSecurityScanResult {
  passed: boolean;
  score: number; // 0 to 100
  findings: InfrastructureSecurityFinding[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
}

export interface InfrastructureValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  security?: InfrastructureSecurityScanResult;
}

export interface InfrastructureProfile {
  id: "minimal" | "standard" | "production" | "high-availability";
  name: string;
  description: string;
  replicas: number;
  resources: {
    requests: {
      cpu: string;
      memory: string;
    };
    limits: {
      cpu: string;
      memory: string;
    };
  };
  probes: {
    readiness: boolean;
    liveness: boolean;
    startup: boolean;
  };
  autoscaling?: {
    enabled: boolean;
    minReplicas: number;
    maxReplicas: number;
    targetCPUUtilizationPercentage: number;
  };
  rollingUpdate: {
    maxSurge: string | number;
    maxUnavailable: string | number;
  };
  security: {
    runAsNonRoot: boolean;
    readOnlyRootFilesystem: boolean;
    dropCapabilities: string[];
    allowPrivilegeEscalation: boolean;
  };
}

export interface InfrastructureConfig {
  $schema?: string;
  version: number;
  provider: InfrastructureProviderId;
  environment: InfrastructureEnvironment;
  profile: InfrastructureProfile["id"];
  namespace?: string;
  context?: string;
  settings: {
    appName?: string;
    domain?: string;
    tlsEnabled?: boolean;
    replicas?: number;
    port?: number;
    healthEndpoint?: string;
    readinessEndpoint?: string;
    ingressEnabled?: boolean;
    hpaEnabled?: boolean;
  };
  customOverrides?: Partial<InfrastructureProfile>;
  updatedAt: string;
}

export interface InfrastructureContext {
  targetDir: string;
  projectName: string;
  packageManager: PackageManager;
  uiLibrary: UiLibrary;
  plugins: string[];
  config: InfrastructureConfig;
  dryRun?: boolean;
}

export interface DetectionResult {
  detected: boolean;
  confidence: number;
  reason?: string;
  filesFound: string[];
}

export interface InfrastructureProvider {
  id: InfrastructureProviderId;
  name: string;
  description: string;
  documentationUrl?: string;

  detect(context: InfrastructureContext): Promise<DetectionResult>;
  validate(context: InfrastructureContext, options?: { checkSecurity?: boolean }): Promise<InfrastructureValidationResult>;
  plan(context: InfrastructureContext, options?: { environment?: InfrastructureEnvironment }): Promise<InfrastructurePlan>;
  apply(plan: InfrastructurePlan, context: InfrastructureContext, options?: InfrastructureApplyOptions): Promise<InfrastructureApplyResult>;
  destroy(context: InfrastructureContext, options?: InfrastructureDestroyOptions): Promise<InfrastructureDestroyResult>;
  status(context: InfrastructureContext, options?: InfrastructureStatusOptions): Promise<InfrastructureStatusResult>;
  diff(context: InfrastructureContext, options?: { environment?: InfrastructureEnvironment }): Promise<InfrastructureDiffResult>;
  scale?(context: InfrastructureContext, options: InfrastructureScaleOptions): Promise<InfrastructureScaleResult>;
  securityScan?(context: InfrastructureContext): Promise<InfrastructureSecurityScanResult>;
}
