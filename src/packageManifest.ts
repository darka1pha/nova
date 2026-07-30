import type { Answers } from "./types.js";

/**
 * Builds the generated project's package.json.
 * Kept as pure data so it's easy to bump versions in one place.
 */
export function buildPackageJson({ projectName, features, uiLibrary = "shadcn" }: Pick<Answers, "projectName" | "features"> & Partial<Pick<Answers, "uiLibrary">>) {
  const scripts: Record<string, string> = {
    dev: "next dev --turbopack",
    build: "next build",
    start: "next start",
    lint: "eslint .",
    "lint:fix": "eslint . --fix",
    format: "prettier --write .",
    typecheck: "tsc --noEmit",
  };

  const dependencies: Record<string, string> = {
    next: "^15.1.0",
    react: "^19.0.0",
    "react-dom": "^19.0.0",
    "next-intl": "^4.13.0",
    "react-hook-form": "^7.54.0",
    zod: "^3.24.1",
    "@hookform/resolvers": "^3.9.1",
    clsx: "^2.1.1",
    "tailwind-merge": "^2.5.5",
    "class-variance-authority": "^0.7.1",
    "lucide-react": "^0.468.0",
    "@radix-ui/react-slot": "^1.1.1",
    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-dropdown-menu": "^2.1.4",
    "@radix-ui/react-label": "^2.1.1",
    "@radix-ui/react-toast": "^1.2.4",
    "next-themes": "^0.4.4",
  };

  const devDependencies: Record<string, string> = {
    typescript: "^5.7.2",
    "@types/node": "^22.10.2",
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    eslint: "^9.17.0",
    "@eslint/js": "^9.17.0",
    "@next/eslint-plugin-next": "^15.1.0",
    "eslint-config-next": "^15.1.0",
    globals: "^15.14.0",
    "@typescript-eslint/eslint-plugin": "^8.18.2",
    "@typescript-eslint/parser": "^8.18.2",
    "eslint-plugin-simple-import-sort": "^12.1.1",
    prettier: "^3.4.2",
    "prettier-plugin-tailwindcss": "^0.6.9",
    tailwindcss: "^3.4.17",
    postcss: "^8.4.49",
    autoprefixer: "^10.4.20",
  };

  if (uiLibrary === "mui") {
    dependencies["@emotion/react"] = "^11.14.0";
    dependencies["@emotion/styled"] = "^11.14.1";
    dependencies["@mui/icons-material"] = "^9.2.0";
    dependencies["@mui/material"] = "^9.2.0";
    dependencies["@mui/material-nextjs"] = "^9.1.1";
  }

  if (uiLibrary === "chakra") {
    dependencies["@chakra-ui/react"] = "^3.36.1";
    dependencies["@emotion/react"] = "^11.14.0";
  }

  if (uiLibrary === "ant") {
    dependencies["antd"] = "^5.10.0";
  }

  if (uiLibrary === "mantine") {
    dependencies["@mantine/core"] = "^6.0.0";
    dependencies["@mantine/hooks"] = "^6.0.0";
  }

  if (uiLibrary === "hero") {
    dependencies["@nextui-org/react"] = "^1.0.0";
  }

  if (uiLibrary === "daisy") {
    devDependencies["daisyui"] = "^3.1.0";
  }

  if (uiLibrary === "headless") {
    dependencies["@headlessui/react"] = "^1.8.0";
    dependencies["@heroicons/react"] = "^2.0.18";
  }

  if (features.prisma) {
    dependencies["@prisma/client"] = "^6.1.0";
    devDependencies["prisma"] = "^6.1.0";
    scripts["db:generate"] = "prisma generate";
    scripts["db:migrate"] = "prisma migrate dev";
    scripts["db:studio"] = "prisma studio";
    scripts["db:seed"] = "tsx prisma/seed.ts";
    devDependencies["tsx"] = "^4.19.2";
  }

  if (features.betterAuth) {
    dependencies["better-auth"] = "^1.1.7";
  }

  if (features.tanstackQuery) {
    dependencies["@tanstack/react-query"] = "^5.62.11";
    devDependencies["@tanstack/react-query-devtools"] = "^5.62.11";
  }

  if (features.cypress) {
    devDependencies["cypress"] = "^13.17.0";
    devDependencies["@testing-library/cypress"] = "^10.0.3";
    scripts["cy:open"] = "cypress open";
    scripts["cy:run"] = "cypress run";
    scripts["e2e"] = "start-server-and-test dev http://localhost:3000 cy:run";
    devDependencies["start-server-and-test"] = "^2.0.9";
  }

  if (features.playwright) {
    devDependencies["@playwright/test"] = "^1.61.1";
    scripts["pw:test"] = "playwright test";
    scripts["pw:ui"] = "playwright test --ui";
    scripts["pw:install"] = "playwright install";
  }

  if (features.vitest) {
    devDependencies["vitest"] = "^2.1.8";
    devDependencies["@vitejs/plugin-react"] = "^4.3.4";
    devDependencies["@testing-library/react"] = "^16.1.0";
    devDependencies["@testing-library/jest-dom"] = "^6.6.3";
    devDependencies["jsdom"] = "^25.0.1";
    scripts["test"] = "vitest run";
    scripts["test:watch"] = "vitest";
  }

  if (features.storybook) {
    devDependencies["storybook"] = "^8.4.7";
    devDependencies["@storybook/nextjs"] = "^8.4.7";
    devDependencies["@storybook/react"] = "^8.4.7";
    devDependencies["@storybook/addon-essentials"] = "^8.4.7";
    devDependencies["@storybook/addon-a11y"] = "^8.4.7";
    devDependencies["msw-storybook-addon"] = "^2.0.0";
    scripts["storybook"] = "storybook dev -p 6006";
    scripts["build-storybook"] = "storybook build";
  }

  if (features.husky) {
    devDependencies["husky"] = "^9.1.7";
    devDependencies["lint-staged"] = "^15.2.11";
    scripts["prepare"] = "husky";
  }

  if (features.pwa) {
    dependencies["next-pwa"] = "^5.6.0";
  }

  if (features.bundleAnalyzer) {
    devDependencies["@next/bundle-analyzer"] = "^15.1.0";
    scripts["analyze"] = "ANALYZE=true next build";
  }

  if (features.zustand) {
    dependencies["zustand"] = "^5.0.2";
  }

  // Phase 1 plugins
  if (features.redis) {
    // ioredis is robust and commonly used for both simple and advanced use
    // cases (reconnections, clusters). Expose it when redis feature is
    // selected so generated projects can import src/lib/redis client.
    dependencies["ioredis"] = "^5.3.2";
  }

  if (features.mailpit) {
    // nodemailer for SMTP sending in development (Mailpit acts as SMTP sink)
    dependencies["nodemailer"] = "^6.9.3";
  }

  if (features.securityHeaders) {
    // no external deps required; provide a small helper in the template
  }

  if (features.health) {
    // health checks may depend on redis/prisma being present; no extra
    // dependencies required at scaffold-time.
  }

  if (features.msw) {
    devDependencies["msw"] = "^2.7.0";
    scripts["mock:api"] = "msw init public --save";
  }

  if (features.reactEmail) {
    dependencies["@react-email/components"] = "^0.0.33";
    dependencies["@react-email/render"] = "^1.0.3";
    devDependencies["react-email"] = "^3.0.6";
    scripts["email:dev"] = "email dev --dir src/emails --port 3001";
  }

  if (features.sentry) {
    dependencies["@sentry/nextjs"] = "^10.66.0";
  }

  if (features.openapi) {
    dependencies["openapi-fetch"] = "^0.17.0";
    devDependencies["openapi-typescript"] = "^7.13.0";
    scripts["api:types"] = "openapi-typescript ./openapi/schema.yaml -o ./src/lib/api/schema.d.ts";
  }

  if (features.animations) {
    dependencies["framer-motion"] = "^11.3.0";
  }

  if (features.tanstackTable) {
    dependencies["@tanstack/react-table"] = "^8.20.5";
  }

  if (features.recharts) {
    dependencies["recharts"] = "^2.13.3";
  }

  if (features.tiptap) {
    dependencies["@tiptap/react"] = "^2.10.4";
    dependencies["@tiptap/starter-kit"] = "^2.10.4";
    dependencies["@tiptap/extension-placeholder"] = "^2.10.4";
    dependencies["@tiptap/extension-link"] = "^2.10.4";
    dependencies["@tiptap/extension-image"] = "^2.10.4";
  }

  return {
    name: projectName,
    version: "0.1.0",
    private: true,
    scripts,
    dependencies: sortKeys(dependencies),
    devDependencies: sortKeys(devDependencies),
  };
}

function sortKeys<T extends Record<string, string>>(obj: T) {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
}