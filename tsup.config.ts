import { defineConfig } from "tsup";

export default defineConfig({
  // Named explicitly (rather than an array of paths) because both
  // src/index.ts and src/generator/index.ts are named "index.ts" - tsup
  // would otherwise derive the same "index.js" output basename for both
  // and one would clobber the other. This mapping keeps the published
  // output filenames stable (dist/index.js, dist/generator.js) exactly as
  // before the src/generator.ts -> src/generator/index.ts move, so
  // bin/nova.js and scripts/smoke-test.mjs need no changes.
  entry: {
    index: "src/index.ts",
    generator: "src/generator/index.ts",
  },
  format: ["esm"],
  target: "node18",
  outDir: "dist",
  platform: "node",
  clean: true,
  splitting: false,
  sourcemap: true,
  dts: false,
  // @nova/core is an internal, unpublished workspace package — it must be
  // inlined into the bundle. Everything else in "dependencies" (execa,
  // fs-extra, @clack/prompts, picocolors) stays external since those are
  // real published packages that npm will install alongside this CLI.
  noExternal: ["@nova/core"],
});