# @react-doctor/runtime

Internal Effect-based runtime layer for React Doctor. **Not published.**
This package is the place where React Doctor's diagnostic pipeline becomes
schema-decoded at the wire, swappable behind `Context.Service`s, and consumed
as a `Stream` instead of an array.

It does not (yet) replace `inspect()` or the CLI entry point. It is the
foundation those will sit on top of, introduced one slice at a time so the
existing CLI keeps shipping while the migration moves forward.

## What's here

### Schemas (`diagnostic-schema.ts`, `json-report-schema.ts`)

Wire-level schemas for `Diagnostic` and `JsonReport`, expressed with
`effect/Schema`. `JsonReport` is exported as a `Schema.Union([JsonReportV1])`
so adding `schemaVersion: 2` later is one new union member, decoded by every
downstream consumer (evals, eslint plugin host, GitHub Action, IDE host)
through one schema instead of trusting fields.

`buildDiagnosticIdentity` produces the stable
`${file}::${line}:${col}::${plugin}/${rule}` identity. Promotion of this
key into the producer is what unlocks suppression files, baselines, parity
diffs, IDE "ignore this" actions, and content-hash-keyed caches without
each consumer re-deriving the key.

### Tagged-error facade (`errors.ts`)

`ReactDoctorError` carries a tagged `reason` union over leaf errors
(`OxlintBinaryNotFound`, `OxlintTimedOut`, `OxlintOutputTooLarge`,
`OxlintOutputUnparseable`, `OxlintBatchFileDropped`, `ConfigParseFailed`,
`ProjectNotFound`, `NoReactDependency`, ...). Callers match on the facade
tag with `Effect.catchTag`, then fan out over reasons with
`Effect.catchReason` / `Effect.catchReasons` / `Effect.unwrapReason`.
`formatReactDoctorError` is the single place CLI/JSON/Action wording lives.

This replaces the `format-error-chain.ts` `instanceof Error` walk with an
exhaustive discriminator: adding a new leaf reason becomes one new case in
the renderer, and TypeScript enforces exhaustiveness through the `_tag`
discriminant.

### `Linter` service (`linter.ts`)

`Linter` is the cross-backend Service for "produce diagnostics for an
input." `lint(input)` returns a `Stream<Diagnostic, ReactDoctorError>`.

- `Linter.layerOxlint` — wraps the existing `runOxlint` from
  `@react-doctor/core`. Soft-failures (a per-batch timeout drop) surface as
  `Effect.logWarning(OxlintBatchFileDropped { ... })` rather than failing
  the stream, matching the existing partial-failure contract.
- `Linter.layerNoop` — returns `Stream.empty`. Useful for `--no-lint` and
  for callers that only want to exercise the rest of the pipeline.
- `Linter.layerOf(diagnostics)` — returns the supplied diagnostics
  regardless of input. The test surface; equivalent in spirit to
  react-doctor-evals' `Runner.layerTest`.

Adding a new backend (Biome, ESLint worker pool, Vercel Sandbox) is one
new layer that satisfies the `Linter` interface — no other code path
changes.

### `Reporter` service (`reporter.ts`)

`Reporter` consumes the diagnostic stream one element at a time and
finalizes once. Implementations are "side-effect at the wire" — turn a
diagnostic into stdout output, an NDJSON line, an LSP
`publishDiagnostics`, or a SARIF entry.

- `Reporter.layerNoop` — drops every diagnostic.
- `Reporter.layerCapture` — captures into a `Ref` exposed as the second
  service `ReporterCapture`. Tests `yield* Ref.get(yield* ReporterCapture)`
  to assert on what the pipeline emitted.

### Streaming pipeline (`pipeline.ts`)

`runDiagnosticPipeline(input, { keep })` composes `Linter.lint` →
`Stream.filter(keep)` → `Reporter.emit` and folds severity counts in one
pass. Returns `DiagnosticPipelineCounts`. Callers decide what to do with
the counts (CLI summary, `--fail-on` exit code, JSON summary).

The pipeline never materializes an intermediate array. A 50k-diagnostic
monorepo scan holds at most one diagnostic in flight in this layer.

## Patterns demonstrated

These mirror the load-bearing moves in the `react-doctor-evals` codebase
tour:

1. **Schema is the wire.** Every boundary decode goes through one
   `Schema.decode` call; version evolution is `Schema.Union(V1, V2, ...)`.
2. **Two orthogonal axes via Layers.** `Linter` (which backend produces
   diagnostics) is independent of `Reporter` (where they go).
3. **Streams instead of arrays.** Bounded memory, TTFB-friendly, naturally
   composes with future incremental / watch / LSP modes.
4. **Tagged errors with a `reason` union.** Single facade, exhaustive
   matches, no `instanceof` checks.

## What this package intentionally does **not** do

- It does **not** replace `inspect()`, `diagnose()`, or the CLI today.
- It does **not** depend on the legacy `format-error-chain` /
  `combineDiagnostics` stack — those remain in place; this package is the
  parallel skeleton subsequent slices will adopt incrementally.
- It does **not** contain Node-only filesystem code. The `Linter`
  service forwards to `runOxlint`, but the schemas, errors, and pipeline
  are framework-free.
