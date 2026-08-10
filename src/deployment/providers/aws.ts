import fs from "fs-extra";
import path from "node:path";

import type { DeploymentConfigOptions, DeploymentProvider, DeploymentResult } from "../types.js";

export const awsProvider: DeploymentProvider = {
  id: "aws",
  name: "AWS (App Runner & ECS)",
  description: "Enterprise containerized deployment on AWS App Runner or Elastic Container Service",
  documentationUrl: "https://docs.aws.amazon.com/apprunner",

  async validate(targetDir: string) {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!(await fs.pathExists(path.join(targetDir, "package.json")))) {
      errors.push("No package.json found in project directory");
    }
    return { ok: errors.length === 0, errors, warnings };
  },

  async generateConfig(options: DeploymentConfigOptions): Promise<DeploymentResult> {
    const { targetDir, force = false, dryRun = false } = options;
    const filesWritten: string[] = [];
    const filesSkipped: string[] = [];
    const scriptsAdded: string[] = [];

    // 1. apprunner.yaml
    const apprunnerContent = `version: 1.0
runtime: nodejs20
build:
  commands:
    build:
      - npm ci
      - npm run build
run:
  command: npm run start
  network:
    port: 3000
    env: APP_PORT
`;

    const apprunnerPath = path.join(targetDir, "apprunner.yaml");
    if (!force && (await fs.pathExists(apprunnerPath))) {
      filesSkipped.push("apprunner.yaml");
    } else {
      if (!dryRun) {
        await fs.writeFile(apprunnerPath, apprunnerContent, "utf8");
      }
      filesWritten.push("apprunner.yaml");
    }

    // 2. .github/workflows/deploy-aws.yml
    const workflowDir = path.join(targetDir, ".github", "workflows");
    const workflowPath = path.join(workflowDir, "deploy-aws.yml");

    const workflowContent = `name: Build & Push to AWS ECR

on:
  push:
    branches: [main]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: \${{ secrets.AWS_REGION || 'us-east-1' }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image to Amazon ECR
        env:
          ECR_REGISTRY: \${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: \${{ secrets.ECR_REPOSITORY }}
          IMAGE_TAG: \${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
`;

    if (!force && (await fs.pathExists(workflowPath))) {
      filesSkipped.push(".github/workflows/deploy-aws.yml");
    } else {
      if (!dryRun) {
        await fs.ensureDir(workflowDir);
        await fs.writeFile(workflowPath, workflowContent, "utf8");
      }
      filesWritten.push(".github/workflows/deploy-aws.yml");
    }

    // 3. docs/deployment/aws.md
    const docsDir = path.join(targetDir, "docs", "deployment");
    const docsPath = path.join(docsDir, "aws.md");

    const docsContent = `# AWS Deployment Guide

This project is configured for **AWS App Runner** and **AWS ECS/ECR**.

## 1. AWS App Runner (Fastest)

1. In the AWS App Runner Console, create a new service.
2. Connect your GitHub repository.
3. Select configuration file mode: App Runner will detect \`apprunner.yaml\`.

## 2. GitHub Actions CI/CD with AWS ECR

Add the following GitHub Repository Secrets:
- \`AWS_ACCESS_KEY_ID\`
- \`AWS_SECRET_ACCESS_KEY\`
- \`AWS_REGION\` (e.g. \`us-east-1\`)
- \`ECR_REPOSITORY\` (Name of your AWS ECR repo)
`;

    if (!force && (await fs.pathExists(docsPath))) {
      filesSkipped.push("docs/deployment/aws.md");
    } else {
      if (!dryRun) {
        await fs.ensureDir(docsDir);
        await fs.writeFile(docsPath, docsContent, "utf8");
      }
      filesWritten.push("docs/deployment/aws.md");
    }

    return {
      provider: "aws",
      providerName: "AWS (App Runner & ECS)",
      targetDir,
      filesWritten,
      filesSkipped,
      scriptsAdded,
      dryRun,
      instructions: [
        "Generated apprunner.yaml and AWS ECR GitHub Actions workflow.",
        "Configure AWS secrets in your GitHub repository.",
        "See docs/deployment/aws.md for full step-by-step setup.",
      ],
    };
  },
};
