import { SUPPRESSION_NEAR_MISS_MAX_LINES } from "../constants.js";

// Capture group 1 is the optional rule list, restricted to characters
// that legally appear in plugin / rule identifiers and their separators
// (`,`, whitespace) so it can never absorb the block-comment terminator
// `*/` or the JSX `}`.
const DISABLE_NEXT_LINE_PATTERN =
  /(?:\/\/|\/\*)\s*react-doctor-disable-next-line\b(?:\s+([\w/\-.,\s]+?))?\s*(?:\*\/)?\s*\}?\s*$/;

export interface StackedDisableComment {
  commentLineIndex: number;
  ruleList: string | undefined;
  isInChain: boolean;
}

// Walks upward from `anchorIndex - 1` collecting `react-doctor-disable-next-line`
// comments within `SUPPRESSION_NEAR_MISS_MAX_LINES` lines. Each comment
// is tagged `isInChain: true` when it sits in an unbroken stack of
// disable-next-line comments above the anchor (so the user's
// "stack the same comment for two rules" pattern works). The first
// non-comment line ends the chain; further matches found within the
// budget are tagged `isInChain: false` and feed near-miss diagnosis.
export const findStackedDisableCommentsAbove = (
  lines: string[],
  anchorIndex: number,
): StackedDisableComment[] => {
  const collected: StackedDisableComment[] = [];
  let isStillInChain = true;

  for (
    let candidateIndex = anchorIndex - 1;
    candidateIndex >= 0 && anchorIndex - candidateIndex <= SUPPRESSION_NEAR_MISS_MAX_LINES;
    candidateIndex--
  ) {
    const candidateLine = lines[candidateIndex];
    if (candidateLine === undefined) break;

    const match = candidateLine.match(DISABLE_NEXT_LINE_PATTERN);
    if (match) {
      collected.push({
        commentLineIndex: candidateIndex,
        ruleList: match[1],
        isInChain: isStillInChain,
      });
      continue;
    }
    isStillInChain = false;
  }

  return collected;
};
