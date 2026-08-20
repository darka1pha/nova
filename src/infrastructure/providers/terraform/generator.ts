import type { InfrastructureContext } from "../../types.js";

export interface TerraformManifestBundle {
  mainTf: string;
  variablesTf: string;
  outputsTf: string;
  tfvarsExample: string;
}

export function generateTerraformConfig(context: InfrastructureContext): TerraformManifestBundle {
  const { projectName, config } = context;
  const appName = config.settings.appName || projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const env = config.environment || "production";

  const mainTf = `terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "${appName}"
      Environment = var.environment
      ManagedBy   = "Nova"
    }
  }
}

# Application Container Repository (ECR)
resource "aws_ecr_repository" "app" {
  name                 = "${appName}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

# App Runner Service for Auto-scaling Container Workloads
resource "aws_apprunner_service" "app" {
  service_name = "${appName}-${env}"

  source_configuration {
    image_repository {
      image_identifier      = "\${aws_ecr_repository.app.repository_url}:latest"
      image_repository_type = "ECR"
      image_configuration {
        port = var.app_port
        runtime_environment_variables = {
          NODE_ENV = var.environment
          PORT     = tostring(var.app_port)
        }
      }
    }
    auto_deployments_enabled = true
  }

  instance_configuration {
    cpu    = var.cpu_units
    memory = var.memory_units
  }
}
`;

  const variablesTf = `variable "aws_region" {
  description = "Target AWS deployment region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Target deployment environment tier"
  type        = string
  default     = "${env}"
}

variable "app_port" {
  description = "Container exposed port"
  type        = number
  default     = ${config.settings.port || 3000}
}

variable "cpu_units" {
  description = "App Runner CPU allocation (e.g. 1024 = 1 vCPU)"
  type        = string
  default     = "1024"
}

variable "memory_units" {
  description = "App Runner memory allocation (e.g. 2048 = 2 GB)"
  type        = string
  default     = "2048"
}
`;

  const outputsTf = `output "service_url" {
  description = "Public URL for the deployed App Runner service"
  value       = aws_apprunner_service.app.service_url
}

output "ecr_repository_url" {
  description = "ECR Docker container repository URL"
  value       = aws_ecr_repository.app.repository_url
}
`;

  const tfvarsExample = `# Terraform Variables Example
# Copy to terraform.tfvars to configure custom values
aws_region   = "us-east-1"
environment  = "${env}"
app_port     = ${config.settings.port || 3000}
cpu_units    = "1024"
memory_units = "2048"
`;

  return {
    mainTf,
    variablesTf,
    outputsTf,
    tfvarsExample,
  };
}
