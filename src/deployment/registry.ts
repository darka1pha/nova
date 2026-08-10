import { awsProvider } from "./providers/aws.js";
import { cloudflareProvider } from "./providers/cloudflare.js";
import { dockerDeploymentProvider } from "./providers/docker.js";
import { railwayProvider } from "./providers/railway.js";
import { renderProvider } from "./providers/render.js";
import { vercelProvider } from "./providers/vercel.js";
import type { DeploymentProvider, DeploymentProviderId } from "./types.js";

export class DeploymentProviderRegistry {
  private readonly providers = new Map<DeploymentProviderId, DeploymentProvider>();

  constructor() {
    this.register(vercelProvider);
    this.register(cloudflareProvider);
    this.register(railwayProvider);
    this.register(renderProvider);
    this.register(awsProvider);
    this.register(dockerDeploymentProvider);
  }

  register(provider: DeploymentProvider): this {
    this.providers.set(provider.id, provider);
    return this;
  }

  get(id: string): DeploymentProvider | undefined {
    return this.providers.get(id.toLowerCase() as DeploymentProviderId);
  }

  has(id: string): boolean {
    return this.providers.has(id.toLowerCase() as DeploymentProviderId);
  }

  list(): DeploymentProvider[] {
    return Array.from(this.providers.values());
  }

  requireProvider(id: string): DeploymentProvider {
    const provider = this.get(id);
    if (!provider) {
      const valid = Array.from(this.providers.keys()).join(", ");
      throw new Error(`Unknown deployment provider "${id}". Supported providers: ${valid}`);
    }
    return provider;
  }
}

let defaultRegistry: DeploymentProviderRegistry | undefined;

export function getDeploymentRegistry(): DeploymentProviderRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new DeploymentProviderRegistry();
  }
  return defaultRegistry;
}
