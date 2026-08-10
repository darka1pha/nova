import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "./src/lib/graphql/schema.ts",
  documents: ["src/**/*.{ts,tsx,graphql}"],
  generates: {
    "./src/lib/graphql/generated.ts": {
      plugins: ["typescript", "typescript-operations"],
      config: {
        skipTypename: false,
        withHooks: false,
        withHOC: false,
        withComponent: false,
      },
    },
  },
};

export default config;
