import { getInfrastructureProfile } from "../../config.js";
import type { InfrastructureContext, InfrastructureProfile } from "../../types.js";

export interface KubernetesManifestBundle {
  deployment: string;
  service: string;
  configMap: string;
  secret: string;
  ingress: string;
  hpa?: string;
  kustomization: string;
}

export function generateKubernetesManifests(
  context: InfrastructureContext,
  overrides?: {
    replicas?: number;
    namespace?: string;
    profileId?: InfrastructureProfile["id"];
  },
): KubernetesManifestBundle {
  const { projectName, config } = context;
  const profileId = overrides?.profileId ?? config.profile ?? "production";
  const profile = getInfrastructureProfile(profileId);
  const replicas = overrides?.replicas ?? overrides?.replicas ?? config.settings.replicas ?? profile.replicas;
  const namespace = overrides?.namespace ?? config.namespace ?? projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const appName = config.settings.appName || projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const port = config.settings.port || 3000;
  const healthEndpoint = config.settings.healthEndpoint || "/api/ready";
  const readinessEndpoint = config.settings.readinessEndpoint || "/api/ready";
  const domain = config.settings.domain || `${appName}.example.com`;

  // 1. Deployment
  const deploymentYaml = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${appName}
  namespace: ${namespace}
  labels:
    app.kubernetes.io/name: ${appName}
    app.kubernetes.io/instance: ${appName}
    app.kubernetes.io/managed-by: nova
spec:
  replicas: ${replicas}
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: ${profile.rollingUpdate.maxSurge}
      maxUnavailable: ${profile.rollingUpdate.maxUnavailable}
  selector:
    matchLabels:
      app.kubernetes.io/name: ${appName}
  template:
    metadata:
      labels:
        app.kubernetes.io/name: ${appName}
    spec:
      securityContext:
        runAsNonRoot: ${profile.security.runAsNonRoot}
        runAsUser: 1001
        runAsGroup: 1001
        fsGroup: 1001
      containers:
        - name: app
          image: \${IMAGE_NAME:-${appName}:latest}
          imagePullPolicy: IfNotPresent
          ports:
            - name: http
              containerPort: ${port}
              protocol: TCP
          envFrom:
            - configMapRef:
                name: ${appName}-config
            - secretRef:
                name: ${appName}-secret
                optional: true
          resources:
            requests:
              cpu: "${profile.resources.requests.cpu}"
              memory: "${profile.resources.requests.memory}"
            limits:
              cpu: "${profile.resources.limits.cpu}"
              memory: "${profile.resources.limits.memory}"
          securityContext:
            readOnlyRootFilesystem: ${profile.security.readOnlyRootFilesystem}
            allowPrivilegeEscalation: ${profile.security.allowPrivilegeEscalation}
            capabilities:
              drop:
                - ALL
          readinessProbe:
            httpGet:
              path: ${readinessEndpoint}
              port: http
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3
          ${profile.probes.liveness ? `livenessProbe:
            httpGet:
              path: ${healthEndpoint}
              port: http
            initialDelaySeconds: 15
            periodSeconds: 20
            timeoutSeconds: 5
            failureThreshold: 3` : ""}
          ${profile.probes.startup ? `startupProbe:
            httpGet:
              path: ${healthEndpoint}
              port: http
            initialDelaySeconds: 2
            periodSeconds: 5
            failureThreshold: 30` : ""}
          volumeMounts:
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir: {}
`;

  // 2. Service
  const serviceYaml = `apiVersion: v1
kind: Service
metadata:
  name: ${appName}
  namespace: ${namespace}
  labels:
    app.kubernetes.io/name: ${appName}
    app.kubernetes.io/managed-by: nova
spec:
  type: ClusterIP
  ports:
    - name: http
      port: 80
      targetPort: http
      protocol: TCP
  selector:
    app.kubernetes.io/name: ${appName}
`;

  // 3. ConfigMap
  const configMapYaml = `apiVersion: v1
kind: ConfigMap
metadata:
  name: ${appName}-config
  namespace: ${namespace}
  labels:
    app.kubernetes.io/name: ${appName}
    app.kubernetes.io/managed-by: nova
data:
  NODE_ENV: "production"
  PORT: "${port}"
  NEXT_TELEMETRY_DISABLED: "1"
`;

  // 4. Secret Reference Template (Safe - no plaintext values committed)
  const secretYaml = `apiVersion: v1
kind: Secret
metadata:
  name: ${appName}-secret
  namespace: ${namespace}
  labels:
    app.kubernetes.io/name: ${appName}
    app.kubernetes.io/managed-by: nova
type: Opaque
# NOTICE: Configure production secrets via external secret store, sealed secrets, or CI/CD injection.
# Never commit plaintext passwords or credentials to git repositories.
stringData:
  # DATABASE_URL: "postgresql://user:password@host:5432/db"
  # AUTH_SECRET: "replace-with-random-secret"
`;

  // 5. Ingress
  const ingressYaml = `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${appName}
  namespace: ${namespace}
  labels:
    app.kubernetes.io/name: ${appName}
    app.kubernetes.io/managed-by: nova
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - ${domain}
      secretName: ${appName}-tls
  rules:
    - host: ${domain}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: ${appName}
                port:
                  name: http
`;

  // 6. HorizontalPodAutoscaler (if enabled)
  let hpaYaml: string | undefined;
  if (profile.autoscaling?.enabled || config.settings.hpaEnabled) {
    const hpa = profile.autoscaling || { minReplicas: 2, maxReplicas: 10, targetCPUUtilizationPercentage: 70 };
    hpaYaml = `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${appName}-hpa
  namespace: ${namespace}
  labels:
    app.kubernetes.io/name: ${appName}
    app.kubernetes.io/managed-by: nova
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${appName}
  minReplicas: ${hpa.minReplicas}
  maxReplicas: ${hpa.maxReplicas}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: ${hpa.targetCPUUtilizationPercentage}
`;
  }

  // 7. Kustomization
  const resourcesList = [
    "deployment.yaml",
    "service.yaml",
    "configmap.yaml",
    "secret.yaml",
    "ingress.yaml",
  ];
  if (hpaYaml) {
    resourcesList.push("hpa.yaml");
  }

  const kustomizationYaml = `apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: ${namespace}
resources:
${resourcesList.map((r) => `  - ${r}`).join("\n")}
commonLabels:
  app.kubernetes.io/managed-by: nova
`;

  return {
    deployment: deploymentYaml,
    service: serviceYaml,
    configMap: configMapYaml,
    secret: secretYaml,
    ingress: ingressYaml,
    hpa: hpaYaml,
    kustomization: kustomizationYaml,
  };
}
