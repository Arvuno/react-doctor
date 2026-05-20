import { describe, expect, it } from "vite-plus/test";
import { Effect, Layer, Ref, Stream } from "effect";

import type { Diagnostic } from "../src/diagnostic-schema.js";
import { LintPartialFailures, Linter, type LintInput } from "../src/linter.js";
import type { ProjectInfo } from "@react-doctor/types";

const stubProject: ProjectInfo = {
  rootDirectory: "/repo",
  projectName: "stub",
  reactVersion: "19.0.0",
  reactMajorVersion: 19,
  tailwindVersion: null,
  framework: "vite",
  hasTypeScript: true,
  hasReactCompiler: false,
  hasTanStackQuery: false,
  hasReactNativeWorkspace: false,
  sourceFileCount: 1,
};

const stubInput: LintInput = {
  rootDirectory: "/repo",
  project: stubProject,
};

const makeDiagnostic = (overrides: Partial<Diagnostic> = {}): Diagnostic => ({
  filePath: "src/App.tsx",
  plugin: "react-doctor",
  rule: "no-secrets-in-client-code",
  severity: "error",
  message: "",
  help: "",
  line: 1,
  column: 1,
  category: "Security",
  ...overrides,
});

describe("Linter.layerComposite", () => {
  it("concatenates diagnostics from every backend, in order", async () => {
    const oxlintLike = Linter.of({
      lint: () =>
        Stream.fromIterable([
          makeDiagnostic({ plugin: "react-doctor", rule: "rule-a" }),
          makeDiagnostic({ plugin: "react-doctor", rule: "rule-b" }),
        ]),
    });
    const eslintLike = Linter.of({
      lint: () => Stream.fromIterable([makeDiagnostic({ plugin: "eslint", rule: "rule-c" })]),
    });

    const program = Effect.gen(function* () {
      const linter = yield* Linter;
      return yield* Stream.runCollect(linter.lint(stubInput));
    });

    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(
          Layer.mergeAll(
            Linter.layerComposite([oxlintLike, eslintLike]),
            LintPartialFailures.layerLive,
          ),
        ),
      ),
    );

    expect(result.map((entry) => `${entry.plugin}/${entry.rule}`)).toEqual([
      "react-doctor/rule-a",
      "react-doctor/rule-b",
      "eslint/rule-c",
    ]);
  });

  it("an empty backend list produces an empty stream (sentinel for callers that disable lint)", async () => {
    const program = Effect.gen(function* () {
      const linter = yield* Linter;
      return yield* Stream.runCollect(linter.lint(stubInput));
    });

    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(Layer.mergeAll(Linter.layerComposite([]), LintPartialFailures.layerLive)),
      ),
    );

    expect(result).toEqual([]);
  });

  it("composes with LintPartialFailures so each backend can push soft failures into the shared Ref", async () => {
    const oxlintLike = Linter.of({
      lint: () =>
        Stream.unwrap(
          Effect.gen(function* () {
            const partialFailures = yield* LintPartialFailures;
            yield* Ref.update(partialFailures, (existing) => [
              ...existing,
              "oxlint: 2 files dropped",
            ]);
            return Stream.fromIterable([makeDiagnostic({ rule: "ox-rule" })]);
          }),
        ),
    });
    const biomeLike = Linter.of({
      lint: () =>
        Stream.unwrap(
          Effect.gen(function* () {
            const partialFailures = yield* LintPartialFailures;
            yield* Ref.update(partialFailures, (existing) => [
              ...existing,
              "biome: 1 file dropped",
            ]);
            return Stream.fromIterable([makeDiagnostic({ plugin: "biome", rule: "biome-rule" })]);
          }),
        ),
    });

    const program = Effect.gen(function* () {
      const linter = yield* Linter;
      const diagnostics = yield* Stream.runCollect(linter.lint(stubInput));
      const partialFailures = yield* Ref.get(yield* LintPartialFailures);
      return { diagnostics, partialFailures };
    });

    const { diagnostics, partialFailures } = await Effect.runPromise(
      program.pipe(
        Effect.provide(
          Layer.mergeAll(
            Linter.layerComposite([oxlintLike, biomeLike]),
            LintPartialFailures.layerLive,
          ),
        ),
      ),
    );

    expect(diagnostics.map((entry) => entry.rule)).toEqual(["ox-rule", "biome-rule"]);
    expect(partialFailures).toEqual(["oxlint: 2 files dropped", "biome: 1 file dropped"]);
  });
});
