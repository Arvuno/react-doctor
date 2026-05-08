import type { GroupedRule } from "../types.js";
import { formatIssueAsMarkdown } from "./format-issue-as-markdown.js";

interface FormatAllOptions {
  rootDirectory: string;
  projectName: string;
  scoreLabel?: string;
  scoreValue?: number;
}

const RULE_SEPARATOR = "\n\n---\n\n";

export const formatAllDiagnosticsAsMarkdown = (
  rules: GroupedRule[],
  options: FormatAllOptions,
): string => {
  if (rules.length === 0) {
    return `**React Doctor — ${options.projectName}**\n\nNo diagnostics found in this project.`;
  }

  const totalSites = rules.reduce(
    (runningTotal, rule) => runningTotal + rule.diagnostics.length,
    0,
  );
  const errorRulesCount = rules.filter((rule) => rule.severity === "error").length;
  const warningRulesCount = rules.filter((rule) => rule.severity === "warning").length;

  const headerLines: string[] = [
    `**React Doctor report — ${options.projectName}** (${rules.length} rule${rules.length === 1 ? "" : "s"}, ${totalSites} site${totalSites === 1 ? "" : "s"})`,
    "",
  ];
  if (typeof options.scoreValue === "number") {
    const scoreText =
      options.scoreLabel !== undefined
        ? `${options.scoreValue} / 100 (${options.scoreLabel})`
        : `${options.scoreValue} / 100`;
    headerLines.push(`Score: ${scoreText}`);
  }
  headerLines.push(
    `Severity: ${errorRulesCount} error rule${errorRulesCount === 1 ? "" : "s"}, ${warningRulesCount} warning rule${warningRulesCount === 1 ? "" : "s"}`,
    "",
    "Please fix every diagnostic listed below. Each section names a rule, explains the problem, points at the affected sites, and shows a representative source snippet.",
  );

  const ruleSections = rules.map((rule) => formatIssueAsMarkdown(rule, options.rootDirectory));

  return [headerLines.join("\n"), ...ruleSections].join(RULE_SEPARATOR);
};
