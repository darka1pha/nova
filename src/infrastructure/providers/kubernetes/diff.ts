import type {
  InfrastructureContext,
  InfrastructureDiffResult,
  ResourceDiff,
} from "../../types.js";
import { generateKubernetesManifests } from "./generator.js";

export interface SimulatedLiveResource {
  kind: string;
  name: string;
  namespace: string;
  replicas?: number;
  image?: string;
  ports?: number[];
  limits?: { cpu?: string; memory?: string };
}

export function computeKubernetesDiff(
  context: InfrastructureContext,
  liveResources?: SimulatedLiveResource[],
): InfrastructureDiffResult {
  const manifests = generateKubernetesManifests(context);
  const diffs: ResourceDiff[] = [];
  const appName = context.config.settings.appName || context.projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const desiredReplicas = context.config.settings.replicas ?? 3;

  // Resource 1: Deployment
  const liveDeployment = liveResources?.find((r) => r.kind === "Deployment" && r.name === appName);
  if (!liveDeployment) {
    diffs.push({
      resourceId: `deployment/${appName}`,
      resourceType: "Deployment",
      resourceName: appName,
      status: liveResources ? "missing" : "synchronized",
      differences: [
        {
          field: "replicas",
          desired: desiredReplicas,
          actual: desiredReplicas,
        },
      ],
    });
  } else {
    const differences = [];
    if (liveDeployment.replicas !== undefined && liveDeployment.replicas !== desiredReplicas) {
      differences.push({
        field: "replicas",
        desired: desiredReplicas,
        actual: liveDeployment.replicas,
      });
    }

    diffs.push({
      resourceId: `deployment/${appName}`,
      resourceType: "Deployment",
      resourceName: appName,
      status: differences.length > 0 ? "drifted" : "synchronized",
      differences,
    });
  }

  // Resource 2: Service
  const liveService = liveResources?.find((r) => r.kind === "Service" && r.name === appName);
  diffs.push({
    resourceId: `service/${appName}`,
    resourceType: "Service",
    resourceName: appName,
    status: liveResources && !liveService ? "missing" : "synchronized",
    differences: [],
  });

  // Resource 3: ConfigMap
  diffs.push({
    resourceId: `configmap/${appName}-config`,
    resourceType: "ConfigMap",
    resourceName: `${appName}-config`,
    status: "synchronized",
    differences: [],
  });

  // Resource 4: Ingress
  diffs.push({
    resourceId: `ingress/${appName}`,
    resourceType: "Ingress",
    resourceName: appName,
    status: "synchronized",
    differences: [],
  });

  const synchronized = diffs.filter((d) => d.status === "synchronized").length;
  const drifted = diffs.filter((d) => d.status === "drifted").length;
  const missing = diffs.filter((d) => d.status === "missing").length;
  const extra = diffs.filter((d) => d.status === "extra").length;

  const hasDrift = drifted > 0 || missing > 0 || extra > 0;

  return {
    providerId: "kubernetes",
    environment: context.config.environment,
    hasDrift,
    resources: diffs,
    summary: {
      synchronized,
      drifted,
      missing,
      extra,
    },
    remediation: hasDrift ? 'Run "nova infra apply" to reconcile cluster state with manifests.' : undefined,
  };
}
