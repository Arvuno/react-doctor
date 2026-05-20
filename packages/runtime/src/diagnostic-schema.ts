import { Schema } from "effect";

/**
 * Wire-level schema for a single React Doctor diagnostic.
 *
 * This is the single source of truth for the diagnostic shape that
 * crosses any process boundary — oxlint stdout decode, NDJSON cache
 * lines, RPC payloads, baseline files, IDE wire protocol. Decode at
 * the boundary; never trust raw JSON. Mirrors the structural type
 * defined in `@react-doctor/types` so that today's consumers
 * continue to type-check while migrating to the schema-decoded
 * value.
 */
export const Severity = Schema.Literals(["error", "warning"]);
export type Severity = typeof Severity.Type;

export const Diagnostic = Schema.Struct({
  filePath: Schema.String,
  plugin: Schema.String,
  rule: Schema.String,
  severity: Severity,
  message: Schema.String,
  help: Schema.String,
  url: Schema.optional(Schema.String),
  line: Schema.Number,
  column: Schema.Number,
  category: Schema.String,
  suppressionHint: Schema.optional(Schema.String),
});
export type Diagnostic = typeof Diagnostic.Type;

/**
 * Stable, deterministic identity for a diagnostic. Format mirrors the
 * eval workflow's `${rootDir}::${file}::${line}:${col}::${plugin}/${rule}`
 * shape — promoted into the linter so every consumer (suppression
 * files, baselines, parity diffs, IDE "ignore this" actions, NDJSON
 * caches) keys on the same string instead of re-deriving it.
 */
export const buildDiagnosticIdentity = (diagnostic: Diagnostic): string =>
  `${diagnostic.filePath}::${diagnostic.line}:${diagnostic.column}::${diagnostic.plugin}/${diagnostic.rule}`;
