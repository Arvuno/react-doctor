import { Context, Effect, Layer, Ref, Stream } from "effect";
import { runOxlint } from "@react-doctor/core";
import type { ProjectInfo, ReactDoctorConfig } from "@react-doctor/types";
import { OxlintSpawnFailed, ReactDoctorError } from "./errors.js";
import { Diagnostic } from "./diagnostic-schema.js";

/**
 * Captures per-batch soft failures from the linter without
 * failing the stream. The legacy `runOxlint` already exposed this
 * via an `onPartialFailure` callback; the runtime equivalent is a
 * `Ref` exposed as a service so any caller (the CLI's
 * `skippedCheckReasons["lint:partial"]`, a future LSP host's
 * "some files were skipped" status bar item, the GitHub Action's
 * sticky comment) reads from one place. `Layer.succeed` over a
 * fresh `Ref` is the production wiring; tests provide a
 * pre-populated `Ref` to exercise downstream rendering.
 */
export class LintPartialFailures extends Context.Service<
  LintPartialFailures,
  Ref.Ref<ReadonlyArray<string>>
>()("@react-doctor/runtime/LintPartialFailures") {
  static readonly layerLive = Layer.effect(
    LintPartialFailures,
    Ref.make<ReadonlyArray<string>>([]),
  );
}

/**
 * Inputs to a single `Linter.lint` invocation. Mirrors the subset
 * of `runOxlint`'s options any future backend (an in-process
 * ESLint worker pool, a sandboxed runner, …) would also need.
 * Fields specific to a single implementation belong in that
 * implementation's layer factory, not here — this is the
 * cross-backend contract.
 */
export interface LintInput {
  rootDirectory: string;
  project: ProjectInfo;
  includePaths?: ReadonlyArray<string>;
  customRulesOnly?: boolean;
  respectInlineDisables?: boolean;
  adoptExistingLintConfig?: boolean;
  ignoredTags?: ReadonlySet<string>;
  userConfig?: ReactDoctorConfig | null;
  nodeBinaryPath?: string;
}

/**
 * `runOxlint` raises `ReactDoctorError` instances directly (every
 * exit code is a typed reason). This narrows whatever `tryPromise`
 * caught: tagged errors pass through unchanged, anything else
 * (an unexpected JS-level throw — e.g. fs permission on the temp
 * config dir) gets wrapped in `OxlintSpawnFailed` so the failure
 * channel stays uniform.
 */
const ensureReactDoctorError = (cause: unknown): ReactDoctorError =>
  cause instanceof ReactDoctorError
    ? cause
    : new ReactDoctorError({ reason: new OxlintSpawnFailed({ cause }) });

/**
 * `Linter` is the cross-backend Service for "produce diagnostics for
 * an input." Today the only live layer is `layerOxlint` — wrapping
 * the existing subprocess runner. Adding a second backend (an
 * in-process ESLint worker pool, a runner that targets a
 * sandboxed microVM, etc.) is one new Layer that satisfies this
 * interface, exactly as react-doctor-evals separates
 * `layerLocalWorker` / `layerVercelSandbox`.
 *
 * `lint` returns a `Stream<Diagnostic, ReactDoctorError>` instead of
 * a `Promise<Diagnostic[]>` for two reasons: (1) callers can compose
 * with `Stream.mapEffect` / `filter` / a sink without ever
 * collecting an array, which is what enables incremental and
 * watch-mode pipelines on giant repos; (2) backends that emit
 * diagnostics as they're produced (a daemon, an LSP server) can
 * push into the stream straight from their dispatch loop.
 */
export class Linter extends Context.Service<
  Linter,
  {
    readonly lint: (
      input: LintInput,
    ) => Stream.Stream<Diagnostic, ReactDoctorError, LintPartialFailures>;
  }
>()("@react-doctor/runtime/Linter") {
  /**
   * Layer that delegates to the existing `runOxlint` from
   * `@react-doctor/core`. Soft per-batch failures (a single batch
   * hit the timeout and was dropped, oxlint reported file IDs that
   * couldn't be linted) are pushed onto the
   * `LintPartialFailures` Ref so the orchestrator can fold them
   * into `skippedCheckReasons["lint:partial"]` without the stream
   * itself becoming a failure channel for non-fatal events.
   */
  static readonly layerOxlint = Layer.succeed(
    Linter,
    Linter.of({
      lint: (input: LintInput) =>
        Stream.unwrap(
          Effect.gen(function* () {
            const partialFailures = yield* LintPartialFailures;
            const diagnostics = yield* Effect.tryPromise({
              try: () =>
                runOxlint({
                  rootDirectory: input.rootDirectory,
                  project: input.project,
                  includePaths: input.includePaths ? [...input.includePaths] : undefined,
                  nodeBinaryPath: input.nodeBinaryPath,
                  customRulesOnly: input.customRulesOnly,
                  respectInlineDisables: input.respectInlineDisables,
                  adoptExistingLintConfig: input.adoptExistingLintConfig,
                  ignoredTags: input.ignoredTags,
                  userConfig: input.userConfig ?? null,
                  onPartialFailure: (reason) => {
                    Effect.runSync(
                      Ref.update(partialFailures, (existing) => [...existing, reason]),
                    );
                  },
                }),
              catch: ensureReactDoctorError,
            });
            return Stream.fromIterable(diagnostics as ReadonlyArray<Diagnostic>);
          }),
        ),
    }),
  );

  /**
   * No-op layer for tests / callers that want to construct the
   * pipeline against a `Linter` without running anything. Returns
   * `Stream.empty` for every input.
   */
  static readonly layerNoop = Layer.succeed(
    Linter,
    Linter.of({
      lint: () => Stream.empty,
    }),
  );

  /**
   * Test layer: returns the supplied diagnostics regardless of
   * input. Equivalent to react-doctor-evals' `Runner.layerTest` —
   * the mock surface is the Service interface, not a `vi.mock` of
   * the underlying module. Provide this in tests, then assert on
   * the captured pipeline output.
   */
  static readonly layerOf = (diagnostics: ReadonlyArray<Diagnostic>): Layer.Layer<Linter> =>
    Layer.succeed(
      Linter,
      Linter.of({
        lint: () => Stream.fromIterable(diagnostics),
      }),
    );

  /**
   * Composite layer: runs every supplied linter implementation in
   * sequence and concatenates their diagnostic streams. The
   * downstream pipeline cannot tell the diagnostics apart from a
   * single-backend run — `dedupeDiagnostics` (already inside
   * `runOxlint`'s output path) is the obvious add-on if backends
   * are expected to overlap on rules.
   *
   * This is the layer slot a second-backend integration would
   * plug into — for example, an ESLint worker pool covering rules
   * the oxlint runner can't (yet) express, or a sandboxed runner
   * for untrusted user config — without changing the `Linter`
   * contract or the orchestrator. Each entry is a fully-formed
   * `Linter` implementation (call `Linter.of({ lint })` to
   * construct one). React Doctor itself ships only `layerOxlint`
   * today; this slot exists so that adding more backends never
   * means rewriting the pipeline.
   */
  static readonly layerComposite = (
    backends: ReadonlyArray<Linter["Service"]>,
  ): Layer.Layer<Linter> =>
    Layer.succeed(
      Linter,
      Linter.of({
        lint: (input: LintInput) => {
          if (backends.length === 0) return Stream.empty;
          let stream = backends[0].lint(input);
          for (let index = 1; index < backends.length; index++) {
            stream = stream.pipe(Stream.concat(backends[index].lint(input)));
          }
          return stream;
        },
      }),
    );
}
