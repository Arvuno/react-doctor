import type { Diagnostic, ReactDoctorConfig } from "@react-doctor/types";
import { buildDiagnosticPipeline } from "./build-diagnostic-pipeline.js";

interface MergeAndFilterOptions {
  respectInlineDisables?: boolean;
}

const testFileResultCache = new Map<string, boolean>();

/**
 * Backwards-compatible alias. The legacy test-file cache used to
 * live in this module; the streaming pipeline now owns its own
 * per-scan cache inside `buildDiagnosticPipeline`. This entry
 * point stays so external callers / docs that import
 * `clearAutoSuppressionCaches` keep working.
 */
export const clearAutoSuppressionCaches = (): void => {
  testFileResultCache.clear();
};

/**
 * Array-shaped wrapper around `buildDiagnosticPipeline`. Both this
 * function and the streaming `Stream.filterMap` callers in the
 * runtime now share one transform — there is no second
 * implementation of the auto-suppress / severity / ignore /
 * inline-suppression chain to keep in sync.
 */
export const mergeAndFilterDiagnostics = (
  mergedDiagnostics: Diagnostic[],
  directory: string,
  userConfig: ReactDoctorConfig | null,
  readFileLinesSync: (filePath: string) => string[] | null,
  options: MergeAndFilterOptions = {},
): Diagnostic[] => {
  const pipeline = buildDiagnosticPipeline({
    rootDirectory: directory,
    userConfig,
    readFileLinesSync,
    respectInlineDisables: options.respectInlineDisables,
  });

  const result: Diagnostic[] = [];
  for (const diagnostic of mergedDiagnostics) {
    const transformed = pipeline.apply(diagnostic);
    if (transformed !== null) result.push(transformed);
  }
  return result;
};
