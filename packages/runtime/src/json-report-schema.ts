import { Schema } from "effect";
import { Diagnostic } from "./diagnostic-schema.js";

const JsonReportMode = Schema.Literals(["full", "diff", "staged"]);

const JsonReportDiffInfo = Schema.Struct({
  baseBranch: Schema.String,
  currentBranch: Schema.NullOr(Schema.String),
  changedFileCount: Schema.Number,
  isCurrentChanges: Schema.Boolean,
});

const JsonReportSummary = Schema.Struct({
  errorCount: Schema.Number,
  warningCount: Schema.Number,
  affectedFileCount: Schema.Number,
  totalDiagnosticCount: Schema.Number,
  score: Schema.NullOr(Schema.Number),
  scoreLabel: Schema.NullOr(Schema.String),
});

const JsonReportError = Schema.Struct({
  message: Schema.String,
  name: Schema.String,
  chain: Schema.Array(Schema.String),
});

const JsonReportProjectEntry = Schema.Struct({
  directory: Schema.String,
  diagnostics: Schema.Array(Diagnostic),
  skippedChecks: Schema.Array(Schema.String),
  skippedCheckReasons: Schema.optional(Schema.Record(Schema.String, Schema.String)),
  elapsedMilliseconds: Schema.Number,
});

/**
 * Wire schema for `JsonReport`, version 1.
 *
 * The top-level export is a `Schema.Union` of every schema version we
 * publish. Adding `schemaVersion: 2` later means: add a new member to
 * the union and let consumers branch on the discriminator. This is the
 * exact pattern react-doctor-evals uses for `ReactDoctorJsonReport`,
 * but here it lives in the producer (the linter) so every downstream
 * consumer — evals, IDE host, eslint plugin host, GitHub Action,
 * parity tooling — decodes through one schema instead of trusting
 * fields. Version drift becomes a typed error at the boundary
 * instead of an undefined-field crash three layers in.
 */
export const JsonReportV1 = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  version: Schema.String,
  ok: Schema.Boolean,
  directory: Schema.String,
  mode: JsonReportMode,
  diff: Schema.NullOr(JsonReportDiffInfo),
  projects: Schema.Array(JsonReportProjectEntry),
  diagnostics: Schema.Array(Diagnostic),
  summary: JsonReportSummary,
  elapsedMilliseconds: Schema.Number,
  error: Schema.NullOr(JsonReportError),
});

export const JsonReport = Schema.Union([JsonReportV1]);
export type JsonReport = typeof JsonReport.Type;
