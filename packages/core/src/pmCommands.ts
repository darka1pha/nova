export type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

export function installCommand(pm: PackageManager) {
  switch (pm) {
    case "npm":
      return "npm install";
    case "yarn":
      return "yarn";
    case "bun":
      return "bun install";
    case "pnpm":
    default:
      return "pnpm install";
  }
}

export function devCommand(pm: PackageManager) {
  switch (pm) {
    case "npm":
      return "npm run dev";
    case "yarn":
      return "yarn dev";
    case "bun":
      return "bun run dev";
    case "pnpm":
    default:
      return "pnpm dev";
  }
}

export function execArgs(pm: PackageManager, script: string) {
  switch (pm) {
    case "npm":
      return ["run", script];
    case "yarn":
      return [script];
    case "bun":
      return ["run", script];
    case "pnpm":
    default:
      return [script];
  }
}
