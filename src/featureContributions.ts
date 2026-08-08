import type { PackageAdditions } from "./packageMerge.js";
import type { FeatureKey } from "./types.js";

/**
 * Single source of truth for what each feature contributes to a project's
 * package.json (dependencies, devDependencies, scripts).
 *
 * Previously this data was duplicated by hand across `packageManifest.ts`
 * (used for full `nova <name>` generation) and `featurePackageAdditions.ts`
 * (used for incremental `nova add`), which could silently drift apart -
 * see `src/generator/verifyManifestSync.ts` and
 * `docs/nova-add-command.md`/root README for the history here.
 *
 * Both `buildPackageJson` (packageManifest.ts) and the `nova add` flow
 * (via the re-exported `FEATURE_PACKAGE_ADDITIONS` in
 * featurePackageAdditions.ts) now read from this one map, so a feature's
 * dependencies/scripts only ever need to be declared once.
 *
 * Features that only ship generated files with no package.json footprint
 * (docker, dockerCompose, health, securityHeaders, designSystem, strapi)
 * are still listed explicitly as `{}` so every `FeatureKey` is accounted
 * for and a missing entry is a type error, not a silent omission.
 */
export const FEATURE_CONTRIBUTIONS: Record<FeatureKey, PackageAdditions> = {
  prisma: {
    dependencies: { "@prisma/client": "^6.1.0" },
    devDependencies: { prisma: "^6.1.0", tsx: "^4.19.2" },
    scripts: {
      "db:generate": "prisma generate",
      "db:migrate": "prisma migrate dev",
      "db:studio": "prisma studio",
      "db:seed": "tsx prisma/seed.ts",
    },
  },
  drizzle: {
    // postgres-js driver is the default target - see
    // templates/addons/drizzle/docs/drizzle.md for swapping to another
    // driver (mysql2, better-sqlite3, etc).
    dependencies: { "drizzle-orm": "^0.36.4", postgres: "^3.4.5" },
    devDependencies: { "drizzle-kit": "^0.28.1", dotenv: "^16.4.5" },
    scripts: {
      "db:generate": "drizzle-kit generate",
      "db:migrate": "drizzle-kit migrate",
      "db:push": "drizzle-kit push",
      "db:studio": "drizzle-kit studio",
    },
  },
  betterAuth: {
    dependencies: { "better-auth": "^1.1.7" },
  },
  tanstackQuery: {
    dependencies: { "@tanstack/react-query": "^5.62.11" },
    devDependencies: { "@tanstack/react-query-devtools": "^5.62.11" },
  },
  cypress: {
    devDependencies: {
      cypress: "^13.17.0",
      "@testing-library/cypress": "^10.0.3",
      "start-server-and-test": "^2.0.9",
    },
    scripts: {
      "cy:open": "cypress open",
      "cy:run": "cypress run",
      e2e: "start-server-and-test dev http://localhost:3000 cy:run",
    },
  },
  playwright: {
    devDependencies: { "@playwright/test": "^1.61.1" },
    scripts: {
      "pw:test": "playwright test",
      "pw:ui": "playwright test --ui",
      "pw:install": "playwright install",
    },
  },
  vitest: {
    devDependencies: {
      vitest: "^2.1.8",
      "@vitejs/plugin-react": "^4.3.4",
      "@testing-library/react": "^16.1.0",
      "@testing-library/jest-dom": "^6.6.3",
      jsdom: "^25.0.1",
    },
    scripts: {
      test: "vitest run",
      "test:watch": "vitest",
    },
  },
  storybook: {
    devDependencies: {
      storybook: "^8.4.7",
      "@storybook/nextjs": "^8.4.7",
      "@storybook/react": "^8.4.7",
      "@storybook/addon-essentials": "^8.4.7",
      "@storybook/addon-a11y": "^8.4.7",
      "msw-storybook-addon": "^2.0.0",
    },
    scripts: {
      storybook: "storybook dev -p 6006",
      "build-storybook": "storybook build",
    },
  },
  docker: {},
  dockerCompose: {},
  husky: {
    devDependencies: { husky: "^9.1.7", "lint-staged": "^15.2.11" },
    scripts: { prepare: "husky" },
  },
  pwa: {
    dependencies: { "next-pwa": "^5.6.0" },
  },
  bundleAnalyzer: {
    devDependencies: { "@next/bundle-analyzer": "^15.1.0" },
    scripts: { analyze: "ANALYZE=true next build" },
  },
  zustand: {
    dependencies: { zustand: "^5.0.2" },
  },
  msw: {
    devDependencies: { msw: "^2.7.0" },
    scripts: { "mock:api": "msw init public --save" },
  },
  reactEmail: {
    dependencies: {
      "@react-email/components": "^0.0.33",
      "@react-email/render": "^1.0.3",
    },
    devDependencies: { "react-email": "^3.0.6" },
    scripts: { "email:dev": "email dev --dir src/emails --port 3001" },
  },
  sentry: {
    dependencies: { "@sentry/nextjs": "^10.66.0" },
  },
  openapi: {
    dependencies: { "openapi-fetch": "^0.17.0" },
    devDependencies: { "openapi-typescript": "^7.13.0" },
    scripts: {
      "api:types": "openapi-typescript ./openapi/schema.yaml -o ./src/lib/api/schema.d.ts",
    },
  },
  redis: {
    dependencies: { ioredis: "^5.3.2" },
  },
  mailpit: {
    dependencies: { nodemailer: "^6.9.3" },
  },
  health: {},
  securityHeaders: {},
  designSystem: {},
  strapi: {},
  animations: {
    dependencies: { "framer-motion": "^11.3.0" },
  },
  tanstackTable: {
    dependencies: { "@tanstack/react-table": "^8.20.5" },
  },
  recharts: {
    dependencies: { recharts: "^2.13.3" },
  },
  tiptap: {
    dependencies: {
      "@tiptap/react": "^2.10.4",
      "@tiptap/starter-kit": "^2.10.4",
      "@tiptap/extension-placeholder": "^2.10.4",
      "@tiptap/extension-link": "^2.10.4",
      "@tiptap/extension-image": "^2.10.4",
    },
  },
};