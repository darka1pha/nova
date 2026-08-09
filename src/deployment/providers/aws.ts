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
    const { targetDir, force = false } = options;
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
      await fs.writeFile(apprunnerPath, apprunnerContent, "utf8");
      filesWritten.push("apprunner.yaml");
    }

    // 2. .github/workflows/deploy-aws.yml
    const workflowDir = path.join(targetDir, ".github", "workflows");
    await fs.ensureDir(workflowDir);
    const workflowPath = path.join(workflowDir, "deploy-aws.yml");

    const workflowContent = `name: Build & Push to AWS ECR

on:
  push:
    branches: [main]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: \${{ secrets.AWS_REGION || 'us-east-1' }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push Docker image
        env:
          REGISTRY: \${{ steps.login-ecr.outputs.registry }}
          REPOSITORY: nova-app
          IMAGE_TAG: \${{ github.sha }}
        run: |
          docker build -t $REGISTRY/$REPOSITORY:$IMAGE_TAG -t $REGISTRY/$REPOSITORY:latest .
          docker push $REGISTRY/$REPOSITORY:$IMAGE_TAG
          docker push $REGISTRY/$REPOSITORY:latest
`;

    if (!force && (await fs.pathExists(workflowPath))) {
      filesSkipped.push(".github/workflows/deploy-aws.yml");
    } else {
      await fs.writeFile(workflowPath, workflowContent, "utf8");
      filesWritten.push(".github/workflows/deploy-aws.yml");
    }

    // 3. docs/deployment/aws.md
    const docsDir = path.join(targetDir, "docs", "deployment");
    await fs.ensureDir(docsDir);
    const docsPath = path.join(docsDir, "aws.md");

    const docsContent = `# AWS Deployment Guide

This project supports containerized deployment on **AWS App Runner** and **AWS ECS (Fargate)**.

## Options

1. **AWS App Runner (Fastest)**: Connect your GitHub repository with \`apprunner.yaml\` for automated build and hosting.
2. **AWS ECS / ECR (Production Enterprise)**: Build the multi-stage Dockerfile and push to Amazon ECR using the included GitHub Actions workflow (\`.github/workflows/deploy-aws.yml\`).
`;

    if (!force && (await fs.pathExists(docsPath))) {
      filesSkipped.push("docs/deployment/aws.md");
    } else {
      await fs.writeFile(docsPath, docsContent, "utf8");
      filesWritten.push("docs/deployment/aws.md");
    }

    return {
      provider: "aws",
      providerName: "AWS (App Runner & ECS)",
      targetDir,
      filesWritten,
      filesSkipped,
      scriptsAdded,
      instructions: [
        "Generated apprunner.yaml and AWS ECR GitHub Actions workflow.",
        "Configure AWS credentials in GitHub Secrets if using automated ECR pushes.",
        "See docs/deployment/aws.md for full guidance.",
      ],
    };
  },
};
