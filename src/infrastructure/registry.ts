import { dockerInfraProvider } from "./providers/docker/index.js";
import { dockerComposeInfraProvider } from "./providers/dockerCompose/index.js";
import { kubernetesProvider } from "./providers/kubernetes/index.js";
import { terraformProvider } from "./providers/terraform/index.js";
import type { InfrastructureProvider, InfrastructureProviderId } from "./types.js";

export class InfrastructureProviderRegistry {
  private readonly providers = new Map<InfrastructureProviderId, InfrastructureProvider>();

  constructor() {
    this.register(kubernetesProvider);
    this.register(terraformProvider);
    this.register(dockerInfraProvider);
    this.register(dockerComposeInfraProvider);
  }

  register(provider: InfrastructureProvider): this {
    if (!provider || !provider.id) {
      throw new Error("Cannot register invalid infrastructure provider without an id.");
    }
    this.providers.set(provider.id, provider);
    return this;
  }

  get(id: string): InfrastructureProvider | undefined {
    return this.providers.get(id.toLowerCase() as InfrastructureProviderId);
  }

  has(id: string): boolean {
    return this.providers.has(id.toLowerCase() as InfrastructureProviderId);
  }

  list(): InfrastructureProvider[] {
    return Array.from(this.providers.values());
  }

  requireProvider(id: string): InfrastructureProvider {
    const provider = this.get(id);
    if (!provider) {
      const valid = Array.from(this.providers.keys()).join(", ");
      throw new Error(`Unknown infrastructure provider "${id}". Supported providers: ${valid}`);
    }
    return provider;
  }
}

let defaultInfraRegistry: InfrastructureProviderRegistry | undefined;

export function getInfrastructureRegistry(): InfrastructureProviderRegistry {
  if (!defaultInfraRegistry) {
    defaultInfraRegistry = new InfrastructureProviderRegistry();
  }
  return defaultInfraRegistry;
}
