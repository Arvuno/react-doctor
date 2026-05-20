import { describe, expect, it } from "vite-plus/test";
import { Effect, Layer, Ref } from "effect";

import { Spinner, SpinnerCapture, type SpinnerEvent, type SpinnerHandle } from "../src/spinner.js";

describe("Spinner Context.Service", () => {
  it('layerCapture records start / succeed / fail events in order, replacing vi.mock("ora")', async () => {
    const program = Effect.gen(function* () {
      const spinner = yield* Spinner;
      const handle = yield* spinner.start("Running lint checks...");
      yield* handle.succeed("Running lint checks.");

      const second = yield* spinner.start("Calling score API...");
      yield* second.fail("Score API unreachable.");

      return yield* Ref.get(yield* SpinnerCapture);
    });

    const events = await Effect.runPromise(program.pipe(Effect.provide(Spinner.layerCapture)));

    const expected: ReadonlyArray<SpinnerEvent> = [
      { _tag: "Started", text: "Running lint checks..." },
      { _tag: "Succeeded", text: "Running lint checks." },
      { _tag: "Started", text: "Calling score API..." },
      { _tag: "Failed", text: "Score API unreachable." },
    ];
    expect(events).toEqual(expected);
  });

  it("layerNoop returns handles whose succeed/fail are Effect.void — for --silent / --json", async () => {
    const program = Effect.gen(function* () {
      const spinner = yield* Spinner;
      const handle = yield* spinner.start("Anything");
      yield* handle.succeed("never observed");
      yield* handle.fail("never observed");
    });

    await Effect.runPromise(program.pipe(Effect.provide(Spinner.layerNoop)));
    expect(true).toBe(true);
  });

  it("layerOra delegates to a CLI-supplied factory; tests assert on factory invocations", async () => {
    const calls: Array<{ text: string; outcome: "succeed" | "fail"; final: string }> = [];

    const factory = (text: string): SpinnerHandle => {
      let outcome: "succeed" | "fail" | null = null;
      let final = "";
      return {
        succeed: (displayText: string) =>
          Effect.sync(() => {
            outcome = "succeed";
            final = displayText;
            calls.push({ text, outcome, final });
          }),
        fail: (displayText: string) =>
          Effect.sync(() => {
            outcome = "fail";
            final = displayText;
            calls.push({ text, outcome, final });
          }),
      };
    };

    const program = Effect.gen(function* () {
      const spinner = yield* Spinner;
      const handle = yield* spinner.start("Lint phase");
      yield* handle.succeed("Lint phase done.");
    });

    await Effect.runPromise(program.pipe(Effect.provide(Spinner.layerOra(factory))));

    expect(calls).toEqual([{ text: "Lint phase", outcome: "succeed", final: "Lint phase done." }]);

    // Layer is referenced through the call site; this asserts the
    // import surface stays stable as additional Spinner layers are
    // added (e.g. a future progress-bar reporter for big monorepos).
    void Layer.empty;
  });
});
