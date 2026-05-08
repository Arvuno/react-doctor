import { describe, expect, it } from "vite-plus/test";
import type { Diagnostic } from "../../src/types.js";
import type { GroupedRule } from "../../src/tui/types.js";
import { formatAllDiagnosticsAsMarkdown } from "../../src/tui/utils/format-all-diagnostics-as-markdown.js";

const buildDiagnostic = (overrides: Partial<Diagnostic> = {}): Diagnostic => ({
  filePath: "/repo/src/UserCard.tsx",
  plugin: "react-doctor",
  rule: "no-fetch-in-effect",
  severity: "error",
  message: "Avoid fetch inside useEffect.",
  help: "Use a data-fetching library.",
  line: 42,
  column: 1,
  category: "state-effects",
  ...overrides,
});

const buildRule = (overrides: Partial<GroupedRule> = {}): GroupedRule => ({
  ruleKey: "react-doctor/no-fetch-in-effect",
  plugin: "react-doctor",
  rule: "no-fetch-in-effect",
  severity: "error",
  category: "state-effects",
  message: "Avoid fetch inside useEffect.",
  help: "Use a data-fetching library.",
  diagnostics: [buildDiagnostic()],
  ...overrides,
});

describe("formatAllDiagnosticsAsMarkdown", () => {
  it("returns a friendly empty-state when there are no rules", () => {
    const markdown = formatAllDiagnosticsAsMarkdown([], {
      rootDirectory: "/repo",
      projectName: "ami",
    });
    expect(markdown).toContain("React Doctor — ami");
    expect(markdown).toContain("No diagnostics found in this project.");
  });

  it("includes a project header with rule and site totals", () => {
    const rules = [
      buildRule({
        ruleKey: "react-doctor/rule-a",
        diagnostics: [buildDiagnostic(), buildDiagnostic({ line: 22 })],
      }),
      buildRule({
        ruleKey: "react-doctor/rule-b",
        severity: "warning",
        diagnostics: [buildDiagnostic({ severity: "warning", line: 99 })],
      }),
    ];
    const markdown = formatAllDiagnosticsAsMarkdown(rules, {
      rootDirectory: "/repo",
      projectName: "ami",
    });
    expect(markdown).toContain("**React Doctor report — ami** (2 rules, 3 sites)");
    expect(markdown).toContain("1 error rule");
    expect(markdown).toContain("1 warning rule");
  });

  it("includes the score in the header when supplied", () => {
    const markdown = formatAllDiagnosticsAsMarkdown([buildRule()], {
      rootDirectory: "/repo",
      projectName: "ami",
      scoreValue: 82,
      scoreLabel: "Great",
    });
    expect(markdown).toContain("Score: 82 / 100 (Great)");
  });

  it("contains every rule's section separated by horizontal rules", () => {
    const rules = [
      buildRule({ ruleKey: "react-doctor/rule-a" }),
      buildRule({ ruleKey: "react-doctor/rule-b", severity: "warning" }),
    ];
    const markdown = formatAllDiagnosticsAsMarkdown(rules, {
      rootDirectory: "/repo",
      projectName: "ami",
    });
    expect(markdown).toContain("react-doctor/rule-a");
    expect(markdown).toContain("react-doctor/rule-b");
    expect(markdown.split("---").length).toBeGreaterThanOrEqual(3);
  });

  it("ends with the per-rule action prompt produced by formatIssueAsMarkdown", () => {
    const markdown = formatAllDiagnosticsAsMarkdown(
      [buildRule({ ruleKey: "react-doctor/rule-a" })],
      { rootDirectory: "/repo", projectName: "ami" },
    );
    expect(markdown.trim().endsWith("`react-doctor/rule-a`.")).toBe(true);
  });
});
