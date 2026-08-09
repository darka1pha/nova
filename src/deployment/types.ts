export type DeploymentProviderId =
  | "vercel"
  | "aws"
  | "cloudflare"
  | "railway"
  | "render"
  | "docker";

export interface DeploymentConfigOptions {
  targetDir: string;
  projectName?: string;
  force?: boolean;
}

export interface DeploymentResult {
  provider: DeploymentProviderId;
  providerName: string;
  targetDir: string;
  filesWritten: string[];
  filesSkipped: string[];
  scriptsAdded: string[];
  instructions: string[];
}

export interface DeploymentProvider {
  id: DeploymentProviderId;
  name: string;
  description: string;
  documentationUrl?: string;
  generateConfig(options: DeploymentConfigOptions): Promise<DeploymentResult>;
  validate(targetDir: string): Promise<{ ok: boolean; errors: string[]; warnings: string[] }>;
}
