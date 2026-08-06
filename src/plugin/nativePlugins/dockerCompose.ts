import { FEATURE_CONTRIBUTIONS } from "../../featureContributions.js";
import { PLUGIN_METADATA } from "../../generator/pluginMetadata.js";
import { definePlugin } from "../definePlugin.js";

/**
 * Native manifest for the Docker Compose plugin, demonstrating a
 * `confirm`-type prompt (per the Phase 2 brief's "Docker -> Generate
 * Compose? Yes/No" example) plus a new `env` entry and a `docs`
 * contribution that reads back the plugin's own prompt answer.
 *
 * The `includePostgres` prompt answer still isn't consumed by
 * `generateDockerCompose()` in `src/generator/index.ts` (that function
 * decides service inclusion from `FeatureFlags.prisma`, unchanged) - but
 * `docs/docker-compose.md` below demonstrates that a plugin's *own*
 * contributions (its doc) can already read its *own* prompt answer via
 * `PluginResolutionContext.answers`, which is the mechanism a future pass
 * wiring `templates`/`patches` to prompt answers will reuse.
 *
 * `docs/docker-compose.md` is a path nothing in `templates/` currently
 * writes to, so it's always written (never skipped as "already exists").
 */
export const dockerComposePlugin = definePlugin({
  id: "dockerCompose",
  name: PLUGIN_METADATA.dockerCompose.name,
  version: "1.0.0",
  description: PLUGIN_METADATA.dockerCompose.description,
  category: "infrastructure",
  tags: ["docker", "compose"],
  dependencies: FEATURE_CONTRIBUTIONS.dockerCompose.dependencies,
  devDependencies: FEATURE_CONTRIBUTIONS.dockerCompose.devDependencies,
  scripts: FEATURE_CONTRIBUTIONS.dockerCompose.scripts,
  requires: PLUGIN_METADATA.dockerCompose.requires,
  conflicts: PLUGIN_METADATA.dockerCompose.conflicts,
  supportedUI: PLUGIN_METADATA.dockerCompose.supportedUI,
  prompts: [
    {
      type: "confirm",
      name: "includePostgres",
      message: "Include a Postgres service in docker-compose.yml?",
      default: false,
    },
  ],
  env: [
    {
      key: "COMPOSE_PROJECT_NAME",
      example: "app",
      description:
        "Optional Compose project name, used to namespace containers/volumes when running multiple local instances.",
      required: false,
    },
  ],
  docs: [
    {
      path: "docs/docker-compose.md",
      render: (ctx) => {
        const includePostgres = Boolean(ctx.answers.dockerCompose?.includePostgres);
        const postgresLine = includePostgres
          ? "A `postgres` service is included by your setup answers."
          : "No `postgres` service was requested during setup - enable Prisma or add one to `docker-compose.yml` manually if needed.";

        return `# Docker Compose (dev)

This project includes a \`docker-compose.yml\` for local development services.

## Services

- \`app\` — builds from the local \`Dockerfile\` and runs on port 3000.
- \`mailpit\` — included when the Mailpit plugin is enabled.
- \`redis\` — included when the Redis plugin is enabled.
- \`postgres\` — included when the Prisma plugin is enabled.

${postgresLine}

## Usage

\`\`\`bash
docker compose up
\`\`\`

Set \`COMPOSE_PROJECT_NAME\` in \`.env\` to namespace containers/volumes if you
run multiple instances of this project locally at once.
`;
      },
    },
  ],
});