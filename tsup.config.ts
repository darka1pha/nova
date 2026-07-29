import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/generator.ts"],
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