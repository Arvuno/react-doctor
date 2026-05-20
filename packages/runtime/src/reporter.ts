import fs from "node:fs";
import path from "node:path";
import { Context, Effect, Layer, Ref } from "effect";
import { Diagnostic } from "./diagnostic-schema.js";
import { Schema } from "effect";

/**
 * The captured-diagnostic store backing `Reporter.layerCapture`.
 * Exposed as its own service so tests can `yield*` it directly to
 * read the captured array — the same shape as react-doctor-evals'
 * `GitHub.layerTest` capture refs.
 */
export class ReporterCapture extends Context.Service<
  ReporterCapture,
  Ref.Ref<ReadonlyArray<Diagnostic>>
>()("@react-doctor/runtime/ReporterCapture") {
  static readonly layer = Layer.effect(ReporterCapture, Ref.make<ReadonlyArray<Diagnostic>>([]));
}

/**
 * `Reporter` consumes the diagnostic stream a single element at a
 * time and (optionally) emits a final summary. Implementations
 * should be plain "side-effect at the wire" — turning the stream
 * into stdout output, an NDJSON cache line, an LSP `publishDiagnostics`
 * notification, or a SARIF file. Keeping the surface this small
 * means the streaming pipeline doesn't fan out per-format
 * branches; it just calls `emit` and `finalize` regardless of
 * destination.
 */
export class Reporter extends Context.Service<
  Reporter,
  {
    readonly emit: (diagnostic: Diagnostic) => Effect.Effect<void>;
    readonly finalize: Effect.Effect<void>;
  }
>()("@react-doctor/runtime/Reporter") {
  /**
   * No-op layer — useful when the caller only cares about side
   * effects elsewhere in the pipeline (e.g. `Stream.runFold` over a
   * counters accumulator) and the diagnostic stream itself doesn't
   * need to be rendered.
   */
  static readonly layerNoop: Layer.Layer<Reporter> = Layer.succeed(
    Reporter,
    Reporter.of({
      emit: () => Effect.void,
      finalize: Effect.void,
    }),
  );

  /**
   * Captures every emitted diagnostic into an in-memory `Ref`,
   * which tests read by `yield*`-ing `ReporterCapture`. Mirrors the
   * `createdComments` / `invocations` capture pattern in
   * react-doctor-evals' `tests/GithubJob.test.ts`: assertions live
   * on what the pipeline emitted, not on whether a mocked I/O
   * function was called. The composed layer also provides
   * `ReporterCapture`, so a single `Layer.provide(Reporter.layerCapture)`
   * is enough for the test environment.
   */
  static readonly layerCapture: Layer.Layer<Reporter | ReporterCapture> = Layer.effect(
    Reporter,
    Effect.map(ReporterCapture, (captured) =>
      Reporter.of({
        emit: (diagnostic: Diagnostic) =>
          Ref.update(captured, (existing) => [...existing, diagnostic]),
        finalize: Effect.void,
      }),
    ),
  ).pipe(Layer.provideMerge(ReporterCapture.layer));

  /**
   * Append-only NDJSON reporter: every diagnostic is encoded
   * through the `Diagnostic` Schema and written as a single JSON
   * line. Schema-encode at the wire boundary mirrors the
   * react-doctor-evals NDJSON pipeline; the file is opened with
   * `O_APPEND` so concurrent writers (a future watch mode running
   * a fiber per project) don't corrupt each other's lines.
   *
   * The directory is created lazily so callers don't have to
   * mkdirp — the `.evals/<traceId>.jsonl` shape used by the eval
   * harness "just works" if the path's parent exists or can be
   * created. Errors during open are surfaced as defects so a
   * misconfigured cache path fails loud, not silently.
   */
  static readonly layerNdjson = (filePath: string): Layer.Layer<Reporter> =>
    Layer.effect(
      Reporter,
      Effect.sync(() => {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        const handle = fs.openSync(filePath, "a");
        const encode = Schema.encodeUnknownSync(Diagnostic);

        const emit = (diagnostic: Diagnostic): Effect.Effect<void> =>
          Effect.sync(() => {
            const line = `${JSON.stringify(encode(diagnostic))}\n`;
            fs.writeSync(handle, line);
          });

        const finalize = Effect.sync(() => {
          fs.closeSync(handle);
        });

        return Reporter.of({ emit, finalize });
      }),
    );
}
