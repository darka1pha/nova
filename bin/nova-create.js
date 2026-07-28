#!/usr/bin/env node
import { run } from "../dist/index.js";

run().catch((err) => {
  console.error("\nUnexpected error:\n");
  console.error(err);
  process.exit(1);
});
