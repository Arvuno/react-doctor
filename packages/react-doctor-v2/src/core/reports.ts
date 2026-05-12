import {
  ERROR_RULE_PENALTY,
  PERFECT_SCORE,
  SCORE_GOOD_THRESHOLD,
  SCORE_OK_THRESHOLD,
  WARNING_RULE_PENALTY,
} from "../constants.js";
import type {
  ReactDoctorIssue,
  ReactDoctorJsonReport,
  ReactDoctorJsonReportSummary,
  ReactDoctorResult,
  ReactDoctorScore,
} from "./types.js";

interface IssueRuleCounts {
  errorRuleCount: number;
  warningRuleCount: number;
}

const getIssueRuleKey = (issue: ReactDoctorIssue): string =>
  issue.source?.pluginName && issue.source.ruleId
    ? `${issue.source.pluginName}/${issue.source.ruleId}`
    : (issue.source?.ruleId ?? issue.id);

const getScoreLabel = (score: number): string => {
  if (score >= SCORE_GOOD_THRESHOLD) return "Great";
  if (score >= SCORE_OK_THRESHOLD) return "Needs work";
  return "Critical";
};

const countIssueRules = (issues: ReactDoctorIssue[]): IssueRuleCounts => {
  const errorRules = new Set<string>();
  const warningRules = new Set<string>();

  for (const issue of issues) {
    const ruleKey = getIssueRuleKey(issue);
    if (issue.severity === "error") {
      errorRules.add(ruleKey);
      continue;
    }
    warningRules.add(ruleKey);
  }

  return { errorRuleCount: errorRules.size, warningRuleCount: warningRules.size };
};

export const calculateReactDoctorScore = (issues: ReactDoctorIssue[]): ReactDoctorScore => {
  const { errorRuleCount, warningRuleCount } = countIssueRules(issues);
  const penalty = errorRuleCount * ERROR_RULE_PENALTY + warningRuleCount * WARNING_RULE_PENALTY;
  const value = Math.max(0, Math.round(PERFECT_SCORE - penalty));
  return { value, label: getScoreLabel(value) };
};

export const summarizeReactDoctorResult = (
  result: ReactDoctorResult,
): ReactDoctorJsonReportSummary => {
  const affectedFiles = new Set(
    result.issues.flatMap((issue) => (issue.location?.filePath ? [issue.location.filePath] : [])),
  );
  return {
    errorCount: result.issues.filter((issue) => issue.severity === "error").length,
    warningCount: result.issues.filter((issue) => issue.severity === "warning").length,
    affectedFileCount: affectedFiles.size,
    totalIssueCount: result.issues.length,
    score: result.score?.value ?? null,
    scoreLabel: result.score?.label ?? null,
  };
};

export const buildReactDoctorJsonReport = (result: ReactDoctorResult): ReactDoctorJsonReport => ({
  schemaVersion: 1,
  ok: result.status === "completed" && !result.issues.some((issue) => issue.severity === "error"),
  project: result.project,
  issues: result.issues,
  checks: result.checks,
  summary: summarizeReactDoctorResult(result),
  startedAt: result.startedAt,
  completedAt: result.completedAt,
  durationMilliseconds: result.durationMilliseconds,
});
