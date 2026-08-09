import { getDeploymentRegistry } from "./registry.js";
import type { DeploymentConfigOptions, DeploymentProvider, DeploymentResult } from "./types.js";

export * from "./types.js";
export * from "./registry.js";

export async function generateDeploymentConfig(
  providerId: string,
  options: DeploymentConfigOptions,
): Promise<DeploymentResult> {
  const registry = getDeploymentRegistry();
  const provider = registry.requireProvider(providerId);

  const validation = await provider.validate(options.targetDir);
  if (!validation.ok) {
    throw new Error(
      `Cannot configure deployment for ${provider.name}:\n${validation.errors.join("\n")}`,
    );
  }

  return provider.generateConfig(options);
}

export function listDeploymentProviders(): DeploymentProvider[] {
  return getDeploymentRegistry().list();
}
