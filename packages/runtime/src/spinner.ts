import { Context, Effect, Layer, Ref } from "effect";

/**
 * Handle returned by `Spinner.start`. The interface is
 * intentionally narrow: terminate exactly once with `succeed` /
 * `fail`, with optional human-readable text. Callers don't manage
 * the underlying ora instance, the TTY guard, or the `didFinalize`
 * latch — they ask for a handle and finish it.
 */
export interface SpinnerHandle {
  readonly succeed: (displayText: string) => Effect.Effect<void>;
  readonly fail: (displayText: string) => Effect.Effect<void>;
}

/**
 * Captured spinner events used by `Spinner.layerCapture`. Tests
 * assert against the captured array instead of mocking ora at the
 * module level. The shape is deliberately structural — a future
 * progress-bar reporter or LSP-side status indicator would record
 * the same events.
 */
export interface SpinnerEvent {
  readonly _tag: "Started" | "Succeeded" | "Failed";
  readonly text: string;
}

export class SpinnerCapture extends Context.Service<
  SpinnerCapture,
  Ref.Ref<ReadonlyArray<SpinnerEvent>>
>()("@react-doctor/runtime/SpinnerCapture") {
  static readonly layer = Layer.effect(SpinnerCapture, Ref.make<ReadonlyArray<SpinnerEvent>>([]));
}

/**
 * `Spinner` is the runtime's terminal-feedback service. The CLI
 * uses it during the lint phase; tests provide
 * `Spinner.layerCapture` to record the start/succeed/fail events
 * and assert on them, replacing the legacy
 * `vi.mock("ora", () => ...)` module mock with a layer-driven
 * substitution that respects the project's "tests provide layers,
 * not module mocks" rule.
 */
export class Spinner extends Context.Service<
  Spinner,
  {
    readonly start: (text: string) => Effect.Effect<SpinnerHandle>;
  }
>()("@react-doctor/runtime/Spinner") {
  /**
   * Layer that uses an injected ora factory. Keeps the runtime
   * package free of an `ora` dependency — the CLI provides its
   * own factory built on the existing `spinner.ts` helper.
   */
  static readonly layerOra = (factory: (text: string) => SpinnerHandle): Layer.Layer<Spinner> =>
    Layer.succeed(
      Spinner,
      Spinner.of({
        start: (text: string) => Effect.sync(() => factory(text)),
      }),
    );

  /**
   * No-op spinner. The handle is a pair of `Effect.void`s, so
   * callers can keep the spinner-aware code path without touching
   * stdout (CLI `--silent`, `--score`, `--json`).
   */
  static readonly layerNoop = Layer.succeed(
    Spinner,
    Spinner.of({
      start: () =>
        Effect.succeed({
          succeed: () => Effect.void,
          fail: () => Effect.void,
        }),
    }),
  );

  /**
   * Captures every start/succeed/fail event into a `Ref` exposed
   * via `SpinnerCapture`. Tests assert on the captured array; the
   * mock surface is the Service interface, not a `vi.mock` of the
   * underlying ora module.
   */
  static readonly layerCapture: Layer.Layer<Spinner | SpinnerCapture> = Layer.effect(
    Spinner,
    Effect.map(SpinnerCapture, (events) =>
      Spinner.of({
        start: (text: string) =>
          Effect.gen(function* () {
            yield* Ref.update(events, (existing) => [
              ...existing,
              { _tag: "Started" as const, text },
            ]);
            return {
              succeed: (displayText: string) =>
                Ref.update(events, (existing) => [
                  ...existing,
                  { _tag: "Succeeded" as const, text: displayText },
                ]),
              fail: (displayText: string) =>
                Ref.update(events, (existing) => [
                  ...existing,
                  { _tag: "Failed" as const, text: displayText },
                ]),
            };
          }),
      }),
    ),
  ).pipe(Layer.provideMerge(SpinnerCapture.layer));
}
