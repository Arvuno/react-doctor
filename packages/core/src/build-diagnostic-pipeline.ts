import reactDoctorPlugin from "oxlint-plugin-react-doctor";
import type { Diagnostic, ReactDoctorConfig, RuleSeverityOverride } from "@react-doctor/types";
import {
  compileIgnoreOverrides,
  isDiagnosticIgnoredByOverrides,
} from "./apply-ignore-overrides.js";
import { buildRuleSeverityControls } from "./build-rule-severity-controls.js";
import { evaluateSuppression } from "./evaluate-suppression.js";
import { getDiagnosticRuleIdentity } from "./get-diagnostic-rule-identity.js";
import { compileIgnoredFilePatterns, isFileIgnoredByPatterns } from "./is-ignored-file.js";
import { isTestFilePath } from "./is-test-file.js";
import { resolveRuleSeverityOverride } from "./resolve-rule-severity-override.js";

const SEVERITY_FOR_OVERRIDE: Record<
  Exclude<RuleSeverityOverride, "off">,
  Diagnostic["severity"]
> = {
  error: "error",
  warn: "warning",
};

const restampSeverity = (
  diagnostic: Diagnostic,
  override: Exclude<RuleSeverityOverride, "off">,
): Diagnostic => {
  const targetSeverity = SEVERITY_FOR_OVERRIDE[override];
  if (diagnostic.severity === targetSeverity) return diagnostic;
  return { ...diagnostic, severity: targetSeverity };
};

const OPENING_TAG_PATTERN = /<([A-Z][\w.]*)/;
const JSX_CHILD_OPEN_PATTERN = /<[A-Za-z]/;

const escapeRegExpSpecials = (rawText: string): string =>
  rawText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const resolveCandidateReadPath = (rootDirectory: string, filePath: string): string => {
  const normalizedFile = filePath.replace(/\\/g, "/");
  if (
    normalizedFile.startsWith("/") ||
    /^[a-zA-Z]:\//.test(normalizedFile) ||
    /^[a-zA-Z]:\\/.test(filePath)
  ) {
    return filePath;
  }
  const root = rootDirectory.replace(/\\/g, "/").replace(/\/$/, "");
  return `${root}/${normalizedFile.replace(/^\.\//, "")}`;
};

const isInsideTextComponent = (
  lines: string[],
  diagnosticLine: number,
  textComponentNames: Set<string>,
): boolean => {
  for (let lineIndex = diagnosticLine - 1; lineIndex >= 0; lineIndex--) {
    const match = lines[lineIndex].match(OPENING_TAG_PATTERN);
    if (!match) continue;
    const fullTagName = match[1];
    const leafTagName = fullTagName.includes(".")
      ? (fullTagName.split(".").at(-1) ?? fullTagName)
      : fullTagName;
    return textComponentNames.has(fullTagName) || textComponentNames.has(leafTagName);
  }
  return false;
};

interface JsxOpener {
  fullName: string;
  leafName: string;
  lineIndex: number;
}

interface ResolvedJsxRange {
  closerLineIndex: number;
  closerColumn: number;
  bodyText: string;
}

const findOpenerAtOrAbove = (lines: string[], upperBoundLineIndex: number): JsxOpener | null => {
  for (let lineIndex = upperBoundLineIndex; lineIndex >= 0; lineIndex--) {
    const match = lines[lineIndex].match(OPENING_TAG_PATTERN);
    if (!match) continue;
    const fullName = match[1];
    const leafName = fullName.includes(".") ? (fullName.split(".").at(-1) ?? fullName) : fullName;
    return { fullName, leafName, lineIndex };
  }
  return null;
};

const resolveJsxRange = (lines: string[], opener: JsxOpener): ResolvedJsxRange | null => {
  const closingPattern = new RegExp(
    `</(?:${escapeRegExpSpecials(opener.fullName)}|${escapeRegExpSpecials(opener.leafName)})\\s*>`,
  );

  let closerLineIndex = -1;
  let closerColumn = -1;
  for (let lineIndex = opener.lineIndex; lineIndex < lines.length; lineIndex++) {
    const match = closingPattern.exec(lines[lineIndex]);
    if (!match) continue;
    closerLineIndex = lineIndex;
    closerColumn = match.index;
    break;
  }
  if (closerLineIndex < 0) return null;

  const openerLine = lines[opener.lineIndex];
  const tagStartIndex = openerLine.indexOf(`<${opener.fullName}`);
  if (tagStartIndex < 0) return null;
  const openerEndIndex = openerLine.indexOf(">", tagStartIndex);

  let bodyText: string;
  if (opener.lineIndex === closerLineIndex) {
    if (openerEndIndex < 0 || openerEndIndex >= closerColumn) return null;
    bodyText = openerLine.slice(openerEndIndex + 1, closerColumn);
  } else {
    const segments: string[] = [];
    if (openerEndIndex >= 0) segments.push(openerLine.slice(openerEndIndex + 1));
    for (let lineIndex = opener.lineIndex + 1; lineIndex < closerLineIndex; lineIndex++) {
      segments.push(lines[lineIndex]);
    }
    segments.push(lines[closerLineIndex].slice(0, closerColumn));
    bodyText = segments.join("\n");
  }

  return { closerLineIndex, closerColumn, bodyText };
};

const isInsideStringOnlyWrapper = (
  lines: string[],
  diagnosticLine: number,
  diagnosticColumn: number,
  wrapperNames: Set<string>,
): boolean => {
  const diagnosticLineIndex = diagnosticLine - 1;
  const diagnosticColumnIndex = Math.max(0, diagnosticColumn - 1);
  let upperBoundLineIndex = diagnosticLineIndex;

  while (upperBoundLineIndex >= 0) {
    const opener = findOpenerAtOrAbove(lines, upperBoundLineIndex);
    if (!opener) return false;

    const range = resolveJsxRange(lines, opener);
    if (range === null) {
      upperBoundLineIndex = opener.lineIndex - 1;
      continue;
    }

    const isClosedBeforeDiagnostic =
      range.closerLineIndex < diagnosticLineIndex ||
      (range.closerLineIndex === diagnosticLineIndex &&
        range.closerColumn <= diagnosticColumnIndex);
    if (isClosedBeforeDiagnostic) {
      upperBoundLineIndex = opener.lineIndex - 1;
      continue;
    }

    if (!wrapperNames.has(opener.fullName) && !wrapperNames.has(opener.leafName)) return false;
    return !JSX_CHILD_OPEN_PATTERN.test(range.bodyText);
  }

  return false;
};

export interface DiagnosticPipelineDeps {
  rootDirectory: string;
  userConfig: ReactDoctorConfig | null;
  readFileLinesSync: (filePath: string) => string[] | null;
  respectInlineDisables?: boolean;
}

export interface DiagnosticPipelineTransform {
  /**
   * Applies the entire post-lint diagnostic pipeline to a single
   * diagnostic. Returns `null` to drop the diagnostic, or the
   * (possibly mutated) diagnostic to keep it. Compose with
   * `Stream.filterMap` for streaming pipelines, or call from
   * inside `Array.prototype.flatMap` for the legacy array
   * transform — the contract is the same either way.
   */
  readonly apply: (diagnostic: Diagnostic) => Diagnostic | null;
}

/**
 * Builds the per-element diagnostic pipeline once, capturing the
 * one-time compilation cost (severity controls, ignore-pattern
 * regexes, ignore-override compiler, text-component sets, file-line
 * cache) in a closure. Callers invoke `apply` per diagnostic.
 *
 * Mirrors the four legacy transforms in `mergeAndFilterDiagnostics`,
 * in the same order, with identical semantics:
 *
 * 1. Auto-suppress diagnostics whose rule has the `test-noise` tag
 *    when the diagnostic's file is a test file (cached per-path).
 * 2. Apply user-configured severity controls — drop on `"off"`,
 *    restamp `severity` on `"warn"` / `"error"`.
 * 3. Drop diagnostics whose plugin/rule, file path, or per-rule
 *    override marks them as ignored — including the JSX-aware
 *    `textComponents` / `rawTextWrapperComponents` checks for
 *    `rn-no-raw-text`.
 * 4. Drop diagnostics suppressed by inline
 *    `// react-doctor-disable*` comments; surface near-miss hints
 *    via `suppressionHint` when a comment was close but didn't
 *    match.
 *
 * Steps 3 and 4 read source lines through the supplied
 * `readFileLinesSync`. The shared per-pipeline cache means every
 * file is read at most once across the whole stream, regardless
 * of how many diagnostics target it.
 */
export const buildDiagnosticPipeline = (
  deps: DiagnosticPipelineDeps,
): DiagnosticPipelineTransform => {
  const { rootDirectory, userConfig, readFileLinesSync, respectInlineDisables } = deps;

  const testFileResultCache = new Map<string, boolean>();
  const isTestFileCached = (filePath: string): boolean => {
    const cached = testFileResultCache.get(filePath);
    if (cached !== undefined) return cached;
    const result = isTestFilePath(filePath);
    testFileResultCache.set(filePath, result);
    return result;
  };

  const fileLinesCache = new Map<string, string[] | null>();
  const getFileLines = (filePath: string): string[] | null => {
    const cached = fileLinesCache.get(filePath);
    if (cached !== undefined) return cached;
    const absolutePath = resolveCandidateReadPath(rootDirectory, filePath);
    const lines = readFileLinesSync(absolutePath);
    fileLinesCache.set(filePath, lines);
    return lines;
  };

  const severityControls = buildRuleSeverityControls(userConfig);

  const ignoredRules = userConfig
    ? new Set(
        Array.isArray(userConfig.ignore?.rules)
          ? userConfig.ignore.rules.filter((rule): rule is string => typeof rule === "string")
          : [],
      )
    : new Set<string>();
  const ignoredFilePatterns = userConfig ? compileIgnoredFilePatterns(userConfig) : [];
  const compiledOverrides = userConfig ? compileIgnoreOverrides(userConfig) : [];
  const textComponentNames = new Set<string>(
    userConfig && Array.isArray(userConfig.textComponents)
      ? userConfig.textComponents.filter((name): name is string => typeof name === "string")
      : [],
  );
  const hasTextComponents = textComponentNames.size > 0;
  const rawTextWrapperComponentNames = new Set<string>(
    userConfig && Array.isArray(userConfig.rawTextWrapperComponents)
      ? userConfig.rawTextWrapperComponents.filter(
          (name): name is string => typeof name === "string",
        )
      : [],
  );
  const hasRawTextWrappers = rawTextWrapperComponentNames.size > 0;

  const apply = (diagnostic: Diagnostic): Diagnostic | null => {
    // 1. Auto-suppression.
    const rule =
      diagnostic.plugin === "react-doctor" ? reactDoctorPlugin.rules[diagnostic.rule] : null;
    if (rule?.tags?.includes("test-noise") && isTestFileCached(diagnostic.filePath)) {
      return null;
    }

    // 2. Severity controls (drop on `"off"`, restamp on warn/error).
    let current = diagnostic;
    if (severityControls) {
      const { ruleKey, category } = getDiagnosticRuleIdentity(current);
      const override = resolveRuleSeverityOverride({ ruleKey, category }, severityControls);
      if (override === "off") return null;
      if (override !== undefined) current = restampSeverity(current, override);
    }

    // 3. Ignore filters.
    if (userConfig) {
      const ruleIdentifier = `${current.plugin}/${current.rule}`;
      if (ignoredRules.has(ruleIdentifier)) return null;
      if (isFileIgnoredByPatterns(current.filePath, rootDirectory, ignoredFilePatterns)) {
        return null;
      }
      if (isDiagnosticIgnoredByOverrides(current, rootDirectory, compiledOverrides)) return null;

      if (
        (hasTextComponents || hasRawTextWrappers) &&
        current.rule === "rn-no-raw-text" &&
        current.line > 0
      ) {
        const lines = getFileLines(current.filePath);
        if (lines) {
          if (hasTextComponents && isInsideTextComponent(lines, current.line, textComponentNames)) {
            return null;
          }
          if (
            hasRawTextWrappers &&
            isInsideStringOnlyWrapper(
              lines,
              current.line,
              current.column,
              rawTextWrapperComponentNames,
            )
          ) {
            return null;
          }
        }
      }
    }

    // 4. Inline suppressions (skipped when --no-respect-inline-disables).
    if (respectInlineDisables === false) return current;
    if (current.line <= 0) return current;

    const lines = getFileLines(current.filePath);
    if (!lines) return current;

    const ruleIdentifier = `${current.plugin}/${current.rule}`;
    const evaluation = evaluateSuppression(lines, current.line - 1, ruleIdentifier);
    if (evaluation.isSuppressed) return null;
    if (evaluation.nearMissHint) {
      return { ...current, suppressionHint: evaluation.nearMissHint };
    }
    return current;
  };

  return { apply };
};
