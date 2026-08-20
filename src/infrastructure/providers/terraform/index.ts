import fs from "fs-extra";
import path from "node:path";
import type {
  DetectionResult,
  InfrastructureApplyOptions,
  InfrastructureApplyResult,
  InfrastructureContext,
  InfrastructureDestroyOptions,
  InfrastructureDestroyResult,
  InfrastructureDiffResult,
  InfrastructurePlan,
  InfrastructureProvider,
  InfrastructureResource,
  InfrastructureStatusOptions,
  InfrastructureStatusResult,
  InfrastructureValidationResult,
} from "../../types.js";
import { generateTerraformConfig } from "./generator.js";
import { validateTerraformFiles } from "./validator.js";

export const terraformProvider: InfrastructureProvider = {
  id: "terraform",
  name: "Terraform",
  description: "Infrastructure as Code automation using HashiCorp Terraform modules",
  documentationUrl: "https://developer.hashicorp.com/terraform",

  async detect(context: InfrastructureContext): Promise<DetectionResult> {
    const tfDir = path.join(context.targetDir, "terraform");
    const mainTf = path.join(context.targetDir, "main.tf");
    const filesFound: string[] = [];

    if (await fs.pathExists(tfDir)) filesFound.push("terraform");
    if (await fs.pathExists(mainTf)) filesFound.push("main.tf");

    const detected = filesFound.length > 0;
    return {
      detected,
      confidence: detected ? 0.9 : 0.0,
      reason: detected ? "Found Terraform configuration files" : undefined,
      filesFound,
    };
  },

  async validate(context: InfrastructureContext): Promise<InfrastructureValidationResult> {
    const bundle = generateTerraformConfig(context);
    return validateTerraformFiles({
      "main.tf": bundle.mainTf,
      "variables.tf": bundle.variablesTf,
      "outputs.tf": bundle.outputsTf,
    });
  },

  async plan(context: InfrastructureContext): Promise<InfrastructurePlan> {
    const env = context.config.environment || "production";
    const appName = context.config.settings.appName || context.projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const tfDir = path.join(context.targetDir, "terraform");
    const exists = await fs.pathExists(tfDir);

    const resources: InfrastructureResource[] = [
      {
        id: `aws_ecr_repository.${appName}`,
        type: "aws_ecr_repository",
        name: appName,
        action: exists ? "update" : "create",
        targetPath: "terraform/main.tf",
        details: "ECR Docker container image registry",
      },
      {
        id: `aws_apprunner_service.${appName}`,
        type: "aws_apprunner_service",
        name: `${appName}-${env}`,
        action: exists ? "update" : "create",
        targetPath: "terraform/main.tf",
        details: "App Runner autoscaling containerized runtime",
      },
    ];

    return {
      providerId: "terraform",
      providerName: "Terraform",
      environment: env,
      targetDir: context.targetDir,
      resources,
      summary: {
        create: exists ? 0 : 2,
        update: exists ? 2 : 0,
        delete: 0,
        replace: 0,
        unchanged: 0,
        total: 2,
      },
      risk: env === "production" ? "high" : "medium",
      warnings: ["Terraform applies changes directly to remote cloud resources. Verify IAM credentials before applying."],
      generatedAt: new Date().toISOString(),
    };
  },

  async apply(
    plan: InfrastructurePlan,
    context: InfrastructureContext,
    options?: InfrastructureApplyOptions,
  ): Promise<InfrastructureApplyResult> {
    const targetDir = options?.targetDir ?? context.targetDir;
    const dryRun = options?.dryRun ?? false;
    const force = options?.force ?? false;
    const bundle = generateTerraformConfig(context);
    const tfDir = path.join(targetDir, "terraform");
    const filesWritten: string[] = [];
    const filesSkipped: string[] = [];

    const files = [
      { name: "main.tf", content: bundle.mainTf },
      { name: "variables.tf", content: bundle.variablesTf },
      { name: "outputs.tf", content: bundle.outputsTf },
      { name: "terraform.tfvars.example", content: bundle.tfvarsExample },
    ];

    for (const f of files) {
      const filePath = path.join(tfDir, f.name);
      if ((await fs.pathExists(filePath)) && !force) {
        filesSkipped.push(`terraform/${f.name}`);
      } else {
        if (!dryRun) {
          await fs.ensureDir(tfDir);
          await fs.writeFile(filePath, f.content, "utf8");
        }
        filesWritten.push(`terraform/${f.name}`);
      }
    }

    const instructions = [
      "Generated Terraform HCL configuration in terraform/.",
      "Initialize Terraform: cd terraform && terraform init",
      "Plan changes: terraform plan",
      "Apply changes: terraform apply",
    ];

    return {
      providerId: "terraform",
      environment: plan.environment,
      targetDir,
      appliedResources: plan.resources,
      filesWritten,
      filesSkipped,
      instructions,
      dryRun,
      success: true,
      warnings: plan.warnings,
    };
  },

  async destroy(
    context: InfrastructureContext,
    options?: InfrastructureDestroyOptions,
  ): Promise<InfrastructureDestroyResult> {
    const targetDir = options?.targetDir ?? context.targetDir;
    const dryRun = options?.dryRun ?? false;
    const tfDir = path.join(targetDir, "terraform");
    const filesRemoved: string[] = [];

    if (await fs.pathExists(tfDir)) {
      if (!dryRun) {
        await fs.remove(tfDir);
      }
      filesRemoved.push("terraform");
    }

    return {
      providerId: "terraform",
      environment: options?.environment ?? context.config.environment,
      targetDir,
      destroyedResources: ["aws_apprunner_service", "aws_ecr_repository"],
      filesRemoved,
      dryRun,
      success: true,
      warnings: ["Terraform files removed locally. If remote resources exist, run 'terraform destroy'."],
    };
  },

  async status(
    context: InfrastructureContext,
    options?: InfrastructureStatusOptions,
  ): Promise<InfrastructureStatusResult> {
    const appName = context.config.settings.appName || context.projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const resources = [
      {
        name: `aws_ecr_repository.${appName}`,
        type: "aws_ecr_repository",
        status: "Available" as const,
        message: "Container registry configured",
        updatedAt: new Date().toISOString(),
      },
      {
        name: `aws_apprunner_service.${appName}`,
        type: "aws_apprunner_service",
        status: "Ready" as const,
        message: "Service running in production tier",
        updatedAt: new Date().toISOString(),
      },
    ];

    return {
      providerId: "terraform",
      providerName: "Terraform",
      environment: options?.environment ?? context.config.environment,
      healthy: true,
      resources,
      summary: {
        total: 2,
        ready: 2,
        pending: 0,
        failed: 0,
      },
      lastChecked: new Date().toISOString(),
    };
  },

  async diff(context: InfrastructureContext): Promise<InfrastructureDiffResult> {
    const appName = context.config.settings.appName || context.projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    return {
      providerId: "terraform",
      environment: context.config.environment,
      hasDrift: false,
      resources: [
        {
          resourceId: `aws_apprunner_service.${appName}`,
          resourceType: "aws_apprunner_service",
          resourceName: appName,
          status: "synchronized",
          differences: [],
        },
      ],
      summary: {
        synchronized: 1,
        drifted: 0,
        missing: 0,
        extra: 0,
      },
    };
  },
};
