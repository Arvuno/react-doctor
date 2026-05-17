import picomatch from "picomatch";
import { MAX_GLOB_PATTERN_LENGTH_CHARS, MAX_GLOB_PATTERN_WILDCARD_COUNT } from "../constants.js";

export interface InvalidGlobPatternErrorOptions {
  pattern: string;
  reason: string;
}

export class InvalidGlobPatternError extends Error {
  public readonly pattern: string;
  public readonly reason: string;

  public constructor({ pattern, reason }: InvalidGlobPatternErrorOptions) {
    super(`Invalid glob pattern ${JSON.stringify(pattern)}: ${reason}`);
    this.name = "InvalidGlobPatternError";
    this.pattern = pattern;
    this.reason = reason;
  }
}

const countGlobWildcards = (pattern: string): number => {
  let wildcardCount = 0;
  for (let characterIndex = 0; characterIndex < pattern.length; characterIndex++) {
    const character = pattern[characterIndex];
    if (character === "*" || character === "?") wildcardCount++;
  }
  return wildcardCount;
};

const normalizeGlobPattern = (pattern: string): string =>
  pattern.replace(/\\/g, "/").replace(/^\//, "");

const validateGlobPatternShape = (rawPattern: string): void => {
  if (typeof rawPattern !== "string" || rawPattern.length === 0) {
    throw new InvalidGlobPatternError({
      pattern: String(rawPattern),
      reason: "pattern must be a non-empty string.",
    });
  }
  if (rawPattern.length > MAX_GLOB_PATTERN_LENGTH_CHARS) {
    throw new InvalidGlobPatternError({
      pattern: rawPattern,
      reason: `pattern length ${rawPattern.length} exceeds the maximum of ${MAX_GLOB_PATTERN_LENGTH_CHARS} characters.`,
    });
  }
  const wildcardCount = countGlobWildcards(rawPattern);
  if (wildcardCount > MAX_GLOB_PATTERN_WILDCARD_COUNT) {
    throw new InvalidGlobPatternError({
      pattern: rawPattern,
      reason: `pattern uses ${wildcardCount} wildcards (\`*\` / \`?\`), exceeding the maximum of ${MAX_GLOB_PATTERN_WILDCARD_COUNT}. This guards against catastrophic backtracking from pathological patterns; split the pattern into multiple smaller entries.`,
    });
  }
};

// Reuse the same `picomatch` options everywhere so behavior stays
// identical across compilation sites. `dot: true` preserves the
// historical behavior of the hand-rolled compiler, which made no
// distinction between dotfiles and regular files. `strictSlashes:
// false` keeps trailing-slash matching forgiving (e.g. `src/**`
// matches `src` exactly as well as nested paths).
const PICOMATCH_OPTIONS: picomatch.PicomatchOptions = {
  dot: true,
  strictSlashes: false,
  // Force POSIX path semantics so behavior is identical regardless
  // of the host platform; callers always pre-normalize to forward
  // slashes via `toRelativePath` before testing.
  windows: false,
};

export const compileGlobPattern = (pattern: string): RegExp => {
  validateGlobPatternShape(pattern);
  const normalizedPattern = normalizeGlobPattern(pattern);

  try {
    return picomatch.makeRe(normalizedPattern, PICOMATCH_OPTIONS);
  } catch (caughtError) {
    const reason = caughtError instanceof Error ? caughtError.message : String(caughtError);
    throw new InvalidGlobPatternError({ pattern, reason });
  }
};
