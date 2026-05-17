import path from "node:path";

const REGEX_SPECIAL_CHARACTERS = /[.+^${}()|[\]\\]/g;

// HACK: a deliberately minimal glob compiler mirroring `compileGlobPattern`
// in `@react-doctor/core`. We don't reach across the package boundary
// because oxlint loads this plugin as a self-contained module - pulling
// a core helper in would force the plugin bundle to bloat with every
// transitive core dependency. The supported syntax is identical
// (`*`, `**`, `?`) so user-facing semantics stay consistent.
const compileBarrelAllowlistPattern = (pattern: string): RegExp => {
  // Preserve a leading `/` on the pattern - the matcher tries both
  // relative- and absolute-path candidates, and stripping the leading
  // slash would make `/repo/src/index.ts` (an explicitly-absolute
  // pattern) compile to a regex that can only match the relative form
  // `repo/src/index.ts`. Backslashes are normalized to forward slashes
  // so a single config works on Windows + POSIX.
  const normalized = pattern.replace(/\\/g, "/");
  let regexSource = "^";
  let characterIndex = 0;
  while (characterIndex < normalized.length) {
    if (normalized[characterIndex] === "*" && normalized[characterIndex + 1] === "*") {
      if (normalized[characterIndex + 2] === "/") {
        regexSource += "(?:.+/)?";
        characterIndex += 3;
      } else {
        regexSource += ".*";
        characterIndex += 2;
      }
    } else if (normalized[characterIndex] === "*") {
      regexSource += "[^/]*";
      characterIndex += 1;
    } else if (normalized[characterIndex] === "?") {
      regexSource += "[^/]";
      characterIndex += 1;
    } else {
      regexSource += normalized[characterIndex].replace(REGEX_SPECIAL_CHARACTERS, "\\$&");
      characterIndex += 1;
    }
  }
  regexSource += "$";
  return new RegExp(regexSource);
};

const normalizeForwardSlashes = (filePath: string): string => filePath.split(path.sep).join("/");

const toRelativeForwardSlashes = (filePath: string, rootDirectory: string | undefined): string => {
  if (!rootDirectory || !path.isAbsolute(filePath)) {
    return normalizeForwardSlashes(filePath);
  }
  return normalizeForwardSlashes(path.relative(rootDirectory, filePath));
};

/**
 * Whether the resolved barrel index file is on the user's intentional
 * "public-API barrel" allowlist. Patterns match against the barrel
 * file's path relative to the configured project root (forward-slash
 * normalized so a single config works on Windows and POSIX).
 */
export const matchesBarrelAllowlist = (
  barrelFilePath: string,
  allowlistPatterns: ReadonlyArray<string>,
  rootDirectory: string | undefined,
): boolean => {
  if (allowlistPatterns.length === 0) return false;
  const relativePath = toRelativeForwardSlashes(barrelFilePath, rootDirectory);
  const absolutePath = normalizeForwardSlashes(barrelFilePath);
  for (const pattern of allowlistPatterns) {
    if (!pattern || typeof pattern !== "string") continue;
    const compiledPattern = compileBarrelAllowlistPattern(pattern);
    if (compiledPattern.test(relativePath)) return true;
    if (pattern.startsWith("/") && compiledPattern.test(absolutePath)) return true;
  }
  return false;
};
