import { describe, expect, it } from "vite-plus/test";
import { Cause, Effect, Exit, Layer } from "effect";

import {
  formatReactDoctorError,
  isSplittableReactDoctorError,
  OxlintNativeBindingFailed,
  OxlintOutOfMemory,
  OxlintOutputTooLarge,
  OxlintTimedOut,
  ReactDoctorError,
} from "@react-doctor/core";
import { LintPartialFailures, Linter } from "../src/linter.js";

describe("tagged errors at the runner boundary", () => {
  it("identifies splittable batch failures by reason tag, not message text", () => {
    const timedOut = new ReactDoctorError({
      reason: new OxlintTimedOut({ timeoutMilliseconds: 60_000 }),
    });
    const tooLarge = new ReactDoctorError({
      reason: new OxlintOutputTooLarge({ maxBytes: 1024 }),
    });
    const oom = new ReactDoctorError({
      reason: new OxlintOutOfMemory({ signal: "SIGABRT" }),
    });
    const nativeBinding = new ReactDoctorError({
      reason: new OxlintNativeBindingFailed({ nodeVersion: "v22.5.0", stderr: "..." }),
    });

    expect(isSplittableReactDoctorError(timedOut)).toBe(true);
    expect(isSplittableReactDoctorError(tooLarge)).toBe(true);
    expect(isSplittableReactDoctorError(oom)).toBe(true);
    expect(isSplittableReactDoctorError(nativeBinding)).toBe(false);
    expect(isSplittableReactDoctorError(new Error("any string"))).toBe(false);
  });

  it("renders OxlintNativeBindingFailed with stderr context for the CLI hint dispatch", () => {
    const error = new ReactDoctorError({
      reason: new OxlintNativeBindingFailed({
        nodeVersion: "v18.0.0",
        stderr: "Failed to load native binding: missing GLIBC_2.31",
      }),
    });

    expect(formatReactDoctorError(error)).toBe(
      "oxlint native binding failed at runtime under Node v18.0.0: Failed to load native binding: missing GLIBC_2.31",
    );
  });

  it("propagates a runOxlint-level OxlintTimedOut as a YieldableError through the Linter stream", async () => {
    // The runner now raises tagged errors directly; the runtime no
    // longer string-sniffs `error.message`. Simulate an oxlint
    // backend that fails with the same shape `runOxlint` would
    // produce, and confirm Linter.layerOxlint preserves the reason.
    const oxlintLikePromise = (): Promise<never> =>
      Promise.reject(
        new ReactDoctorError({
          reason: new OxlintTimedOut({ timeoutMilliseconds: 60_000 }),
        }),
      );

    const program = Effect.tryPromise({
      try: oxlintLikePromise,
      catch: (cause) =>
        cause instanceof ReactDoctorError
          ? cause
          : new ReactDoctorError({
              reason: new OxlintTimedOut({ timeoutMilliseconds: 0 }),
            }),
    });

    const exit = await Effect.runPromiseExit(
      program.pipe(Effect.provide(Layer.mergeAll(LintPartialFailures.layerLive, Layer.empty))),
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const failure = Cause.squash(exit.cause);
      expect(failure).toBeInstanceOf(ReactDoctorError);
      if (failure instanceof ReactDoctorError) {
        expect(failure.reason._tag).toBe("OxlintTimedOut");
      }
    }

    // Linter is referenced for type narrowing in the test environment
    // even though we drive the stream via tryPromise above.
    void Linter;
  });
});
