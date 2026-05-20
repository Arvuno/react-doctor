import { describe, expect, it } from "vite-plus/test";
import { Cause, Effect, Exit } from "effect";

import {
  formatReactDoctorError,
  OxlintBinaryNotFound,
  OxlintTimedOut,
  ReactDoctorError,
} from "../src/errors.js";

describe("ReactDoctorError facade with reason union", () => {
  it("renders OxlintBinaryNotFound with the captured node version + requirement", () => {
    const error = new ReactDoctorError({
      reason: new OxlintBinaryNotFound({
        nodeVersion: "v22.5.0",
        requirement: ">=22.0.0",
      }),
    });

    expect(formatReactDoctorError(error)).toBe(
      "oxlint native binding not found for Node v22.5.0; expected one matching >=22.0.0",
    );
  });

  it("propagates as a tagged failure through Effect.gen", () => {
    const program = Effect.gen(function* () {
      yield* new ReactDoctorError({
        reason: new OxlintTimedOut({ timeoutMilliseconds: 60_000 }),
      });
      return "unreachable";
    });

    const exit = Effect.runSyncExit(program);
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const failure = Cause.squash(exit.cause);
      expect(failure).toBeInstanceOf(ReactDoctorError);
      if (failure instanceof ReactDoctorError) {
        expect(failure.reason._tag).toBe("OxlintTimedOut");
      }
    }
  });

  it("can be caught by tag with Effect.catchTag", () => {
    const program = Effect.gen(function* () {
      yield* new ReactDoctorError({
        reason: new OxlintTimedOut({ timeoutMilliseconds: 60_000 }),
      });
      return "unreachable";
    }).pipe(Effect.catchTag("ReactDoctorError", () => Effect.succeed("recovered")));

    expect(Effect.runSync(program)).toBe("recovered");
  });
});
