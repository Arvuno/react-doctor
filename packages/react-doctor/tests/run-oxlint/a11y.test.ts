import { beforeAll, describe } from "vite-plus/test";
import type { Diagnostic } from "@react-doctor/types";
import { runOxlint } from "@react-doctor/core";
import { buildTestProject } from "../regressions/_helpers.js";
import { BASIC_REACT_DIRECTORY, describeRules } from "./_helpers.js";

let basicReactDiagnostics: Diagnostic[];

describe("runOxlint", () => {
  beforeAll(async () => {
    basicReactDiagnostics = await runOxlint({
      rootDirectory: BASIC_REACT_DIRECTORY,
      project: buildTestProject({
        rootDirectory: BASIC_REACT_DIRECTORY,
        hasTanStackQuery: true,
      }),
    });
  });

  describeRules(
    "ported jsx-a11y rules",
    {
      "a11y-alt-text": {
        fixture: "a11y-issues.tsx",
        ruleSource: "rules/correctness.ts",
      },
      "a11y-anchor-is-valid": {
        fixture: "a11y-issues.tsx",
        ruleSource: "rules/correctness.ts",
      },
      "a11y-click-events-have-key-events": {
        fixture: "a11y-issues.tsx",
        ruleSource: "rules/correctness.ts",
      },
      "a11y-no-static-element-interactions": {
        fixture: "a11y-issues.tsx",
        ruleSource: "rules/correctness.ts",
      },
      "a11y-role-has-required-aria-props": {
        fixture: "a11y-issues.tsx",
        ruleSource: "rules/correctness.ts",
      },
      "a11y-no-autofocus": {
        fixture: "a11y-issues.tsx",
        ruleSource: "rules/correctness.ts",
      },
      "a11y-heading-has-content": {
        fixture: "a11y-issues.tsx",
        ruleSource: "rules/correctness.ts",
      },
      "a11y-html-has-lang": {
        fixture: "a11y-issues.tsx",
        ruleSource: "rules/correctness.ts",
      },
      "a11y-no-redundant-roles": {
        fixture: "a11y-issues.tsx",
        ruleSource: "rules/correctness.ts",
      },
      "a11y-scope": {
        fixture: "a11y-issues.tsx",
        ruleSource: "rules/correctness.ts",
      },
      "a11y-tabindex-no-positive": {
        fixture: "a11y-issues.tsx",
        ruleSource: "rules/correctness.ts",
      },
      "a11y-label-has-associated-control": {
        fixture: "a11y-issues.tsx",
        ruleSource: "rules/correctness.ts",
      },
      "a11y-no-distracting-elements": {
        fixture: "a11y-issues.tsx",
        ruleSource: "rules/correctness.ts",
      },
      "a11y-iframe-has-title": {
        fixture: "a11y-issues.tsx",
        ruleSource: "rules/correctness.ts",
      },
    },
    () => basicReactDiagnostics,
  );
});
