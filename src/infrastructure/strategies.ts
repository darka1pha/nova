export type DeploymentStrategyType = "rolling" | "blue-green" | "canary";

export interface RollingUpdateConfig {
  type: "rolling";
  maxSurge: string | number;
  maxUnavailable: string | number;
}

export interface BlueGreenConfig {
  type: "blue-green";
  activeColor: "blue" | "green";
  previewColor: "blue" | "green";
  autoPromote: boolean;
  healthCheckGracePeriodSeconds: number;
}

export interface CanaryConfig {
  type: "canary";
  canaryWeightPercentage: number;
  stableWeightPercentage: number;
  stepPercentage: number;
  stepIntervalSeconds: number;
  maxFailedHealthChecks: number;
}

export type DeploymentStrategy = RollingUpdateConfig | BlueGreenConfig | CanaryConfig;

export function validateStrategy(strategy: DeploymentStrategy): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (strategy.type === "rolling") {
    if (strategy.maxUnavailable === "100%" || strategy.maxUnavailable === 100) {
      errors.push("maxUnavailable cannot be 100% — this would take all instances offline during rolling updates.");
    }
  } else if (strategy.type === "canary") {
    if (strategy.canaryWeightPercentage < 1 || strategy.canaryWeightPercentage > 50) {
      errors.push("Initial canary weight percentage must be between 1% and 50%.");
    }
    if (strategy.canaryWeightPercentage + strategy.stableWeightPercentage !== 100) {
      errors.push("Canary and stable weights must sum to 100%.");
    }
  } else if (strategy.type === "blue-green") {
    if (strategy.activeColor === strategy.previewColor) {
      errors.push("Active and preview environments cannot be the same color in Blue/Green deployments.");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function getDefaultStrategy(type: DeploymentStrategyType = "rolling"): DeploymentStrategy {
  switch (type) {
    case "blue-green":
      return {
        type: "blue-green",
        activeColor: "blue",
        previewColor: "green",
        autoPromote: false,
        healthCheckGracePeriodSeconds: 30,
      };
    case "canary":
      return {
        type: "canary",
        canaryWeightPercentage: 10,
        stableWeightPercentage: 90,
        stepPercentage: 10,
        stepIntervalSeconds: 60,
        maxFailedHealthChecks: 2,
      };
    case "rolling":
    default:
      return {
        type: "rolling",
        maxSurge: "25%",
        maxUnavailable: 0,
      };
  }
}
