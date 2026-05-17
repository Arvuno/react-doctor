import type { ReactDoctorConfig } from "@react-doctor/types";
import { compileGlobPattern, InvalidGlobPatternError } from "./utils/match-glob-pattern.js";
import { toRelativePath } from "./utils/to-relative-path.js";

const warnInvalidIgnorePattern = (configPath: string, error: InvalidGlobPatternError): void => {
  process.stderr.write(`[react-doctor] ${configPath}: ${error.message}\n`);
};

const compilePatternOrWarn = (configPath: string, pattern: string): RegExp | null => {
  try {
    return compileGlobPattern(pattern);
  } catch (caughtError) {
    if (caughtError instanceof InvalidGlobPatternError) {
      warnInvalidIgnorePattern(configPath, caughtError);
      return null;
    }
    throw caughtError;
  }
};

export const compileIgnoredFilePatterns = (userConfig: ReactDoctorConfig | null): RegExp[] => {
  const files = userConfig?.ignore?.files;
  if (!Array.isArray(files)) return [];
  return files
    .filter((entry): entry is string => typeof entry === "string")
    .map((pattern) => compilePatternOrWarn("ignore.files", pattern))
    .filter((compiled): compiled is RegExp => compiled !== null);
};

export const isFileIgnoredByPatterns = (
  filePath: string,
  rootDirectory: string,
  patterns: RegExp[],
): boolean => {
  if (patterns.length === 0) {
    return false;
  }

  const relativePath = toRelativePath(filePath, rootDirectory);
  return patterns.some((pattern) => pattern.test(relativePath));
};
