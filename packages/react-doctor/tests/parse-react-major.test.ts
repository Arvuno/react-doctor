import { describe, expect, it } from "vite-plus/test";
import { parseReactMajor } from "../src/utils/parse-react-major.js";

describe("parseReactMajor", () => {
  it("extracts the major from caret/tilde/exact ranges", () => {
    expect(parseReactMajor("^19.0.0")).toBe(19);
    expect(parseReactMajor("~18.3.1")).toBe(18);
    expect(parseReactMajor("17.0.2")).toBe(17);
    expect(parseReactMajor("19")).toBe(19);
    expect(parseReactMajor("19.x")).toBe(19);
    expect(parseReactMajor("v19.0.0")).toBe(19);
  });

  it("uses the lower bound on multi-comparator ranges", () => {
    expect(parseReactMajor(">=18 <20")).toBe(18);
    expect(parseReactMajor(">=18.3.1 <19")).toBe(18);
    expect(parseReactMajor("18 || 19")).toBe(18);
  });

  it("returns null for tags, workspace protocols, and missing/empty input", () => {
    expect(parseReactMajor(null)).toBeNull();
    expect(parseReactMajor(undefined)).toBeNull();
    expect(parseReactMajor("")).toBeNull();
    expect(parseReactMajor("   ")).toBeNull();
    expect(parseReactMajor("latest")).toBeNull();
    expect(parseReactMajor("next")).toBeNull();
    expect(parseReactMajor("workspace:*")).toBeNull();
    expect(parseReactMajor("*")).toBeNull();
  });

  it("ignores leading whitespace and prefixes", () => {
    expect(parseReactMajor("  ^19.0.0  ")).toBe(19);
    expect(parseReactMajor("npm:react@^19")).toBe(19);
  });
});
