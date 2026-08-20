import { createSecurityScanner } from "../../security.js";
import type { InfrastructureSecurityScanResult, InfrastructureValidationResult } from "../../types.js";

export function validateKubernetesNamespace(namespace: string): { valid: boolean; error?: string } {
  if (!namespace || namespace.length > 63) {
    return { valid: false, error: "Namespace must be between 1 and 63 characters long." };
  }
  const dns1123Regex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
  if (!dns1123Regex.test(namespace)) {
    return {
      valid: false,
      error: `Invalid namespace "${namespace}". Must consist of lower-case alphanumeric characters or '-', and must start and end with an alphanumeric character.`,
    };
  }
  return { valid: true };
}

export function validateKubernetesManifests(
  manifests: Record<string, string>,
): InfrastructureValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsedDocs: any[] = [];

  for (const [filename, content] of Object.entries(manifests)) {
    if (!content || !content.trim()) {
      errors.push(`Manifest "${filename}" is empty.`);
      continue;
    }

    // Basic structure validation
    if (!content.includes("apiVersion:")) {
      errors.push(`Manifest "${filename}" is missing apiVersion.`);
    }
    if (!content.includes("kind:")) {
      errors.push(`Manifest "${filename}" is missing kind.`);
    }
    if (!content.includes("metadata:")) {
      errors.push(`Manifest "${filename}" is missing metadata.`);
    }

    // Extract kind and name for light AST validation
    const kindMatch = content.match(/kind:\s*([A-Za-z0-9]+)/);
    const nameMatch = content.match(/name:\s*([a-z0-9-]+)/);
    const kind = kindMatch ? kindMatch[1] : "Unknown";
    const name = nameMatch ? nameMatch[1] : "unnamed";

    parsedDocs.push({
      kind,
      metadata: { name },
      spec: extractSpecSummary(content),
    });
  }

  // Security scan
  const scanner = createSecurityScanner();
  const securityResult = scanner.scanKubernetesManifests(parsedDocs);

  for (const finding of securityResult.findings) {
    if (finding.severity === "critical" || finding.severity === "high") {
      warnings.push(`[${finding.ruleId}] ${finding.title}: ${finding.description}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    security: securityResult,
  };
}

function extractSpecSummary(content: string): any {
  const spec: any = {};

  const hasNonRoot = content.includes("runAsNonRoot: true");
  const hasHostNetwork = content.includes("hostNetwork: true");
  const hasPrivileged = content.includes("privileged: true");
  const hasLimits = content.includes("limits:");
  const hasReadiness = content.includes("readinessProbe:");
  const hasReadOnly = content.includes("readOnlyRootFilesystem: true");
  const hasDropAll = content.includes("- ALL");
  const hasTls = content.includes("tls:");

  spec.template = {
    spec: {
      hostNetwork: hasHostNetwork,
      securityContext: {
        runAsNonRoot: hasNonRoot,
      },
      containers: [
        {
          name: "app",
          resources: hasLimits ? { limits: { cpu: "1000m", memory: "512Mi" } } : undefined,
          readinessProbe: hasReadiness ? { httpGet: { path: "/api/ready" } } : undefined,
          securityContext: {
            privileged: hasPrivileged,
            readOnlyRootFilesystem: hasReadOnly,
            capabilities: {
              drop: hasDropAll ? ["ALL"] : [],
            },
          },
        },
      ],
    },
  };

  if (hasTls) {
    spec.tls = [{ hosts: ["example.com"], secretName: "tls-secret" }];
  }

  return spec;
}
