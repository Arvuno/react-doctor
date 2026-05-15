import {
  NON_CLIENT_SECRET_HEURISTIC_DIRECTORY_NAMES,
  NON_CLIENT_SECRET_HEURISTIC_FILE_PATTERN,
} from "../constants/security.js";

export const canUseSecretVariableNameHeuristic = (filename: string): boolean => {
  if (filename.length === 0) return true;

  const normalizedFilename = filename.replaceAll("\\", "/");
  if (NON_CLIENT_SECRET_HEURISTIC_FILE_PATTERN.test(normalizedFilename)) return false;

  return normalizedFilename
    .split("/")
    .every((segment) => !NON_CLIENT_SECRET_HEURISTIC_DIRECTORY_NAMES.has(segment));
};
