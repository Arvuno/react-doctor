// HACK: extracts the lowest concrete React major from a peer-dependency
// range. Used to compute the effective React version for libraries:
// a library with `"react": "^17 || ^18 || ^19"` has an effective major
// of 17, so version-gated rules that require React 19+ are suppressed.
const COMPARATOR_SEPARATOR = /[\s,|]+/;
const OR_SEPARATOR = /\s*\|\|\s*/;
const HAS_UPPER_BOUND_COMPARATOR = /<\s*=?\s*\d+(?:\.\d+){0,2}(?:-[^\s,|]+)?/;
const UPPER_BOUND_COMPARATOR = /<\s*=?\s*\d+(?:\.\d+){0,2}(?:-[^\s,|]+)?/g;
const WILDCARD_COMPARATOR = /^[*xX](?:\.[*xX])*$/;

const extractComparatorMajor = (comparator: string): number | null => {
  if (WILDCARD_COMPARATOR.test(comparator)) return null;
  const firstIntegerMatch = comparator.match(/\d+/);
  if (!firstIntegerMatch) return null;
  const major = Number.parseInt(firstIntegerMatch[0], 10);
  return major >= 1 ? major : null;
};

export const peerRangeMinMajor = (range: string | null | undefined): number | null => {
  if (typeof range !== "string") return null;
  let lowestMajor: number | null = null;
  for (const branch of range.trim().split(OR_SEPARATOR).filter(Boolean)) {
    const lowerBoundComparators = branch.replace(UPPER_BOUND_COMPARATOR, " ");
    let branchLowestMajor: number | null = null;
    for (const comparator of lowerBoundComparators
      .trim()
      .split(COMPARATOR_SEPARATOR)
      .filter(Boolean)) {
      const major = extractComparatorMajor(comparator);
      if (major !== null && (branchLowestMajor === null || major < branchLowestMajor)) {
        branchLowestMajor = major;
      }
    }
    if (branchLowestMajor === null && HAS_UPPER_BOUND_COMPARATOR.test(branch)) {
      return null;
    }
    if (branchLowestMajor !== null && (lowestMajor === null || branchLowestMajor < lowestMajor)) {
      lowestMajor = branchLowestMajor;
    }
  }
  return lowestMajor;
};
