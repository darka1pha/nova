import type {
  InfrastructureSecurityFinding,
  InfrastructureSecurityScanResult,
} from "./types.js";

export function createSecurityScanner() {
  return {
    scanKubernetesManifests(manifests: Array<{ kind: string; metadata?: { name?: string }; spec?: any }>): InfrastructureSecurityScanResult {
      const findings: InfrastructureSecurityFinding[] = [];

      for (const doc of manifests) {
        const kind = doc.kind || "Unknown";
        const name = doc.metadata?.name || "unnamed";

        if (kind === "Deployment" || kind === "StatefulSet" || kind === "DaemonSet") {
          const podSpec = doc.spec?.template?.spec;
          const containers = podSpec?.containers || [];

          // SEC-003: Host Network
          if (podSpec?.hostNetwork) {
            findings.push({
              ruleId: "SEC-003",
              severity: "high",
              resourceName: name,
              resourceType: kind,
              title: "Host Networking Enabled",
              description: "Pod is configured with hostNetwork: true, sharing the host network namespace.",
              remediation: "Disable hostNetwork to isolate container network traffic.",
            });
          }

          // SEC-004: Host Path Mounts
          const volumes = podSpec?.volumes || [];
          for (const vol of volumes) {
            if (vol.hostPath) {
              findings.push({
                ruleId: "SEC-004",
                severity: "high",
                resourceName: name,
                resourceType: kind,
                title: "Host Filesystem Mount Detected",
                description: `Volume "${vol.name}" mounts host path "${vol.hostPath.path}".`,
                remediation: "Use emptyDir, persistentVolumeClaim, or ConfigMap instead of hostPath.",
              });
            }
          }

          // Pod Security Context
          const podSec = podSpec?.securityContext;
          if (!podSec?.runAsNonRoot && !containers.some((c: any) => c.securityContext?.runAsNonRoot)) {
            findings.push({
              ruleId: "SEC-002",
              severity: "high",
              resourceName: name,
              resourceType: kind,
              title: "Container May Run As Root",
              description: "Neither pod nor container securityContext sets runAsNonRoot: true.",
              remediation: "Set securityContext.runAsNonRoot: true and define a non-zero runAsUser (e.g. 1001).",
            });
          }

          for (const container of containers) {
            const cSec = container.securityContext;

            // SEC-001: Privileged container
            if (cSec?.privileged) {
              findings.push({
                ruleId: "SEC-001",
                severity: "critical",
                resourceName: `${name}/${container.name}`,
                resourceType: kind,
                title: "Privileged Container Execution",
                description: `Container "${container.name}" has privileged: true.`,
                remediation: "Remove privileged: true and grant only required specific capabilities.",
              });
            }

            // SEC-006: Resource Limits
            if (!container.resources?.limits?.cpu || !container.resources?.limits?.memory) {
              findings.push({
                ruleId: "SEC-006",
                severity: "medium",
                resourceName: `${name}/${container.name}`,
                resourceType: kind,
                title: "Missing CPU or Memory Limits",
                description: `Container "${container.name}" does not specify explicit CPU/memory limits.`,
                remediation: "Define resources.limits.cpu and resources.limits.memory to prevent resource exhaustion.",
              });
            }

            // SEC-007: Health Probes
            if (!container.readinessProbe) {
              findings.push({
                ruleId: "SEC-007",
                severity: "medium",
                resourceName: `${name}/${container.name}`,
                resourceType: kind,
                title: "Missing Readiness Probe",
                description: `Container "${container.name}" does not have a readinessProbe configured.`,
                remediation: "Configure a readinessProbe pointing to application health/ready endpoint.",
              });
            }

            // SEC-009: Read-only Root Filesystem
            if (cSec && cSec.readOnlyRootFilesystem === false) {
              findings.push({
                ruleId: "SEC-009",
                severity: "low",
                resourceName: `${name}/${container.name}`,
                resourceType: kind,
                title: "Root Filesystem is Writable",
                description: `Container "${container.name}" has readOnlyRootFilesystem: false.`,
                remediation: "Set securityContext.readOnlyRootFilesystem: true and use temporary volumes for writable paths.",
              });
            }

            // SEC-010: Drop Capabilities
            const dropCaps = cSec?.capabilities?.drop || [];
            if (!dropCaps.includes("ALL")) {
              findings.push({
                ruleId: "SEC-010",
                severity: "medium",
                resourceName: `${name}/${container.name}`,
                resourceType: kind,
                title: "Linux Capabilities Not Dropped",
                description: `Container "${container.name}" does not drop ALL default Linux capabilities.`,
                remediation: "Add securityContext.capabilities.drop: ['ALL'].",
              });
            }
          }
        }

        if (kind === "Secret") {
          // SEC-005: Plaintext secrets in manifests
          const stringData = doc.spec?.stringData || (doc as any).stringData;
          if (stringData && Object.keys(stringData).length > 0) {
            const hasPotentialSecret = Object.values(stringData).some(
              (v: any) => typeof v === "string" && v.length > 5 && !v.includes("REPLACE_ME"),
            );
            if (hasPotentialSecret) {
              findings.push({
                ruleId: "SEC-005",
                severity: "critical",
                resourceName: name,
                resourceType: kind,
                title: "Unencrypted Secret Value in Manifest",
                description: "Secret resource contains unredacted stringData values in manifest source.",
                remediation: "Use Kubernetes Secret references, ExternalSecrets, Vault, or SealedSecrets instead of committing plaintext secrets.",
              });
            }
          }
        }

        if (kind === "Ingress") {
          const spec = doc.spec || {};
          if (!spec.tls || spec.tls.length === 0) {
            findings.push({
              ruleId: "SEC-008",
              severity: "medium",
              resourceName: name,
              resourceType: kind,
              title: "Ingress Without TLS Configuration",
              description: `Ingress "${name}" does not declare TLS certificates.`,
              remediation: "Configure spec.tls with secretName or cert-manager annotations for HTTPS encryption.",
            });
          }
        }
      }

      const summary = {
        critical: findings.filter((f) => f.severity === "critical").length,
        high: findings.filter((f) => f.severity === "high").length,
        medium: findings.filter((f) => f.severity === "medium").length,
        low: findings.filter((f) => f.severity === "low").length,
        info: findings.filter((f) => f.severity === "info").length,
      };

      // Score calculation: 100 base, subtract based on severity
      const deduction =
        summary.critical * 30 +
        summary.high * 15 +
        summary.medium * 8 +
        summary.low * 3;
      const score = Math.max(0, 100 - deduction);

      return {
        passed: summary.critical === 0 && summary.high === 0,
        score,
        findings,
        summary,
      };
    },
  };
}
