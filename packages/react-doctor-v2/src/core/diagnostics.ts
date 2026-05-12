import path from "node:path";
import type { ReactDoctorConfig, ReactDoctorIssue } from "./types.js";

interface CompiledIgnoreOverride {
  files: string[];
  rules: Set<string> | null;
}

const normalizePath = (filePath: string): string => filePath.replace(/\\/g, "/");

const normalizeRuleId = (issue: ReactDoctorIssue): string => {
  if (issue.source?.pluginName && issue.source.ruleId) {
    return `${issue.source.pluginName}/${issue.source.ruleId}`;
  }
  return issue.source?.ruleId ?? issue.id;
};

const stripRuleNamespace = (ruleId: string): string => ruleId.split("/").at(-1) ?? ruleId;

const matchesRule = (issue: ReactDoctorIssue, rulePatterns: ReadonlySet<string>): boolean => {
  const ruleId = normalizeRuleId(issue);
  return rulePatterns.has(ruleId) || rulePatterns.has(stripRuleNamespace(ruleId));
};

const matchesPathPattern = (filePath: string, pattern: string): boolean => {
  const normalizedFilePath = normalizePath(filePath);
  const normalizedPattern = normalizePath(pattern).replace(/^\.\//, "");
  if (normalizedPattern.endsWith("/**")) {
    const directoryPattern = normalizedPattern.slice(0, -3);
    return (
      normalizedFilePath === directoryPattern ||
      normalizedFilePath.startsWith(`${directoryPattern}/`)
    );
  }
  if (normalizedPattern.includes("*")) {
    const expression = new RegExp(
      `^${normalizedPattern
        .split("*")
        .map((segment) => segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join(".*")}$`,
    );
    return expression.test(normalizedFilePath);
  }
  return (
    normalizedFilePath === normalizedPattern ||
    normalizedFilePath.startsWith(`${normalizedPattern}/`)
  );
};

const toRelativeIssuePath = (issue: ReactDoctorIssue, rootDirectory: string): string => {
  const filePath = issue.location?.filePath;
  if (!filePath) return "";
  if (!path.isAbsolute(filePath)) return normalizePath(filePath);
  return normalizePath(path.relative(rootDirectory, filePath));
};

const compileOverrides = (config: ReactDoctorConfig): CompiledIgnoreOverride[] =>
  (config.ignore?.overrides ?? []).map((override) => ({
    files: override.files,
    rules: override.rules ? new Set(override.rules) : null,
  }));

const isIgnoredByOverride = (
  issue: ReactDoctorIssue,
  filePath: string,
  overrides: CompiledIgnoreOverride[],
): boolean => {
  for (const override of overrides) {
    if (!override.files.some((pattern) => matchesPathPattern(filePath, pattern))) continue;
    if (!override.rules || matchesRule(issue, override.rules)) return true;
  }
  return false;
};

const isDisabledByReactDoctorComment = (
  issue: ReactDoctorIssue,
  sourceLines: string[] | undefined,
): boolean => {
  const line = issue.location?.line;
  if (!line || !sourceLines) return false;

  const ruleId = stripRuleNamespace(normalizeRuleId(issue));
  const sameLine = sourceLines[line - 1] ?? "";
  const previousLine = sourceLines[line - 2] ?? "";
  return (
    (sameLine.includes("react-doctor-disable-line") &&
      (sameLine.includes(ruleId) || !sameLine.includes("react-doctor/"))) ||
    (previousLine.includes("react-doctor-disable-next-line") &&
      (previousLine.includes(ruleId) || !previousLine.includes("react-doctor/")))
  );
};

export const filterReactDoctorIssues = (
  issues: ReactDoctorIssue[],
  config: ReactDoctorConfig,
  rootDirectory: string,
  readSourceLines?: (filePath: string) => string[] | undefined,
): ReactDoctorIssue[] => {
  const ignoredRules = new Set(config.ignore?.rules ?? []);
  const ignoredFiles = config.ignore?.files ?? [];
  const overrides = compileOverrides(config);

  return issues.filter((issue) => {
    const relativeFilePath = toRelativeIssuePath(issue, rootDirectory);
    if (matchesRule(issue, ignoredRules)) return false;
    if (
      relativeFilePath &&
      ignoredFiles.some((pattern) => matchesPathPattern(relativeFilePath, pattern))
    ) {
      return false;
    }
    if (isIgnoredByOverride(issue, relativeFilePath, overrides)) return false;
    if (
      config.respectInlineDisables !== false &&
      relativeFilePath &&
      isDisabledByReactDoctorComment(issue, readSourceLines?.(relativeFilePath))
    ) {
      return false;
    }
    return true;
  });
};
