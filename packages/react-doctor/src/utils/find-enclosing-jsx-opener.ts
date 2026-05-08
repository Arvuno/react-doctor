import { JSX_OPENER_SCAN_MAX_LINES } from "../constants.js";
import { findJsxOpenerSpan } from "./find-jsx-opener-span.js";

// Returns the start line of a multi-line JSX opening tag whose closing
// `>` lands at or after `diagnosticLineIndex` AND whose start is
// strictly above the diagnostic. Returns null when the diagnostic is
// not inside such an opener (single-line tags, no enclosing tag, or
// the opener fits on the diagnostic's own line).
//
// This is the load-bearing piece of the multi-line-JSX suppression
// extension: a `react-doctor-disable-next-line` immediately above the
// returned line covers any diagnostic on attribute lines inside the
// opener.
export const findEnclosingMultilineJsxOpenerStart = (
  lines: string[],
  diagnosticLineIndex: number,
): number | null => {
  for (
    let candidateIndex = diagnosticLineIndex - 1;
    candidateIndex >= 0 && diagnosticLineIndex - candidateIndex <= JSX_OPENER_SCAN_MAX_LINES;
    candidateIndex--
  ) {
    const openerCloseIndex = findJsxOpenerSpan(lines, candidateIndex);
    if (openerCloseIndex !== null && openerCloseIndex >= diagnosticLineIndex) {
      return candidateIndex;
    }
  }
  return null;
};
