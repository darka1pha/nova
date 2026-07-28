import { describe, expect, it } from "vitest";

import { slugify } from "@/utils/slugify";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Hello World!")).toBe("hello-world");
  });

  it("trims leading/trailing separators", () => {
    expect(slugify("  --Edge Case--  ")).toBe("edge-case");
  });
});
