import { findEnclosingMultilineJsxOpenerStart } from "./find-enclosing-jsx-opener.js";
import { findStackedDisableCommentsAbove } from "./find-stacked-disable-comments.js";
import { isRuleListedInComment } from "./is-rule-listed-in-comment.js";

const DISABLE_LINE_PATTERN =
  /(?:\/\/|\/\*)\s*react-doctor-disable-line\b(?:\s+([\w/\-.,\s]+?))?\s*(?:\*\/)?\s*\}?\s*$/;

const isRuleSuppressedByChainAbove = (
  lines: string[],
  anchorIndex: number,
  ruleId: string,
): boolean =>
  findStackedDisableCommentsAbove(lines, anchorIndex).some(
    (comment) => comment.isInChain && isRuleListedInComment(comment.ruleList, ruleId),
  );

// A rule is suppressed at `diagnosticLineIndex` when any of three
// shapes apply:
//   1. A `// react-doctor-disable-line` on the diagnostic line itself
//      (with an optional rule list that includes the rule).
//   2. A `// react-doctor-disable-next-line` immediately above the
//      diagnostic line, possibly stacked with peers above it.
//   3. The diagnostic sits inside a multi-line JSX opening tag, and
//      a `disable-next-line` comment sits immediately above that
//      opener — matching the ESLint convention users expect.
export const isRuleSuppressedAt = (
  lines: string[],
  diagnosticLineIndex: number,
  ruleId: string,
): boolean => {
  const sameLineMatch = lines[diagnosticLineIndex]?.match(DISABLE_LINE_PATTERN);
  if (sameLineMatch && isRuleListedInComment(sameLineMatch[1], ruleId)) return true;

  if (isRuleSuppressedByChainAbove(lines, diagnosticLineIndex, ruleId)) return true;

  const openerStartIndex = findEnclosingMultilineJsxOpenerStart(lines, diagnosticLineIndex);
  if (openerStartIndex !== null && openerStartIndex > 0) {
    return isRuleSuppressedByChainAbove(lines, openerStartIndex, ruleId);
  }

  return false;
};
