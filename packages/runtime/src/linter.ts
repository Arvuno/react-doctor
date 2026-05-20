import { Context, Effect, Layer, Stream } from "effect";
import { runOxlint } from "@react-doctor/core";
import type { ProjectInfo, ReactDoctorConfig } from "@react-doctor/types";
import {
  OxlintBinaryNotFound,
  OxlintBatchFileDropped,
  OxlintOutputTooLarge,
  OxlintOutputUnparseable,
  OxlintSpawnFailed,
  OxlintTimedOut,
  ReactDoctorError,
} from "./errors.js";
import { Diagnostic } from "./diagnostic-schema.js";

/**
 * Inputs to a single `Linter.lint` invocation. Mirrors the subset of
 * `runOxlint`'s options that any backend (oxlint, biome, eslint
 * worker pool, …) would need. Fields specific to a single
 * implementation belong in that implementation's layer factory, not
 * here — this is the cross-backend contract.
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

const OXLINT_TIMEOUT_MILLISECONDS = 60_000;
const OXLINT_OUTPUT_MAX_BYTES = 64 * 1024 * 1024;

/**
 * Maps an `unknown` from the wrapped `runOxlint` callback into a
 * tagged `ReactDoctorError`. The string sniffing here is intentional:
 * `runOxlint` predates the runtime layer and still throws plain
 * `Error`s with shape-coded messages. Once the legacy entry point is
 * retired, every leaf raise becomes a `yield* new ReactDoctorError(...)`
 * and this mapper goes away. Until then this is the one boundary
 * where the two error vocabularies meet.
 */
const mapLegacyOxlintError = (cause: unknown): ReactDoctorError => {
  const message = cause instanceof Error ? cause.message : String(cause);
  if (message.includes("native binding")) {
    return new ReactDoctorError({
      reason: new OxlintBinaryNotFound({
        nodeVersion: process.version,
        requirement: "see oxlint-supported-node-versions",
      }),
    });
  }
  if (message.includes("did not return within")) {
    return new ReactDoctorError({
      reason: new OxlintTimedOut({ timeoutMilliseconds: OXLINT_TIMEOUT_MILLISECONDS }),
    });
  }
  if (message.includes("output exceeded")) {
    return new ReactDoctorError({
      reason: new OxlintOutputTooLarge({ maxBytes: OXLINT_OUTPUT_MAX_BYTES }),
    });
  }
  if (message.includes("Failed to parse oxlint output")) {
    return new ReactDoctorError({
      reason: new OxlintOutputUnparseable({ preview: message }),
    });
  }
  return new ReactDoctorError({
    reason: new OxlintSpawnFailed({ cause }),
  });
};

/**
 * `Linter` is the cross-backend Service for "produce diagnostics for
 * an input." Today the only live layer is `layerOxlint` — wrapping
 * the existing subprocess runner — but adding `layerBiome`,
 * `layerEslintWorkerPool`, or `layerVercelSandbox` becomes a Layer
 * that satisfies this interface, exactly as react-doctor-evals
 * separates `layerLocalWorker` / `layerVercelSandbox`.
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
    readonly lint: (input: LintInput) => Stream.Stream<Diagnostic, ReactDoctorError>;
  }
>()("@react-doctor/runtime/Linter") {
  /**
   * Layer that delegates to the existing `runOxlint` from
   * `@react-doctor/core`. Soft-failures (a single batch hit the
   * timeout and was dropped) are surfaced as
   * `OxlintBatchFileDropped` *log* entries via `Effect.logWarning`
   * rather than failing the stream, matching the partial-failure
   * contract the legacy callback already implements.
   */
  static readonly layerOxlint = Layer.succeed(
    Linter,
    Linter.of({
      lint: (input: LintInput): Stream.Stream<Diagnostic, ReactDoctorError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const droppedFiles: Array<string> = [];
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
                    droppedFiles.push(reason);
                  },
                }),
              catch: mapLegacyOxlintError,
            });
            if (droppedFiles.length > 0) {
              yield* Effect.logWarning(
                new OxlintBatchFileDropped({
                  files: droppedFiles,
                  timeoutMilliseconds: OXLINT_TIMEOUT_MILLISECONDS,
                }),
              );
            }
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
}
