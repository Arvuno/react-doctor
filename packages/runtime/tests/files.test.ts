import path from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { Effect, Layer } from "effect";

import { buildSyncReadFileLines, Files } from "../src/files.js";

describe("Files Context.Service", () => {
  it("layerInMemory exposes readLines / listSourceFiles / isFile / isDirectory backed by a Map", async () => {
    const root = "/repo";
    const tree = new Map<string, string>([
      [
        path.join(root, "src", "App.tsx"),
        "import React from 'react';\nexport const App = () => null;\n",
      ],
      [
        path.join(root, "src", "utils", "format.ts"),
        "export const format = (value: string) => value;\n",
      ],
      [path.join(root, "package.json"), '{"name": "test"}'],
    ]);

    const program = Effect.gen(function* () {
      const files = yield* Files;
      const lines = yield* files.readLines("src/App.tsx", root);
      const sourceFiles = yield* files.listSourceFiles(root);
      const isPackageJsonFile = yield* files.isFile(path.join(root, "package.json"));
      const isUtilsDir = yield* files.isDirectory(path.join(root, "src", "utils"));
      const isMissingDir = yield* files.isDirectory(path.join(root, "missing"));

      return { lines, sourceFiles, isPackageJsonFile, isUtilsDir, isMissingDir };
    });

    const result = await Effect.runPromise(program.pipe(Effect.provide(Files.layerInMemory(tree))));

    expect(result.lines).toEqual([
      "import React from 'react';",
      "export const App = () => null;",
      "",
    ]);
    expect(result.sourceFiles.length).toBe(3);
    expect(result.isPackageJsonFile).toBe(true);
    expect(result.isUtilsDir).toBe(true);
    expect(result.isMissingDir).toBe(false);
  });

  it("buildSyncReadFileLines adapts the Files service to the legacy sync callback shape", async () => {
    const root = "/repo";
    const tree = new Map<string, string>([
      [path.join(root, "a.ts"), "line-a"],
      [path.join(root, "b.ts"), "line-b\nline-b-second"],
    ]);

    const program = Effect.gen(function* () {
      const files = yield* Files;
      const readSync = buildSyncReadFileLines(files, root);
      return {
        a: readSync("a.ts"),
        b: readSync(path.join(root, "b.ts")),
        missing: readSync("missing.ts"),
      };
    });

    const result = await Effect.runPromise(program.pipe(Effect.provide(Files.layerInMemory(tree))));

    expect(result.a).toEqual(["line-a"]);
    expect(result.b).toEqual(["line-b", "line-b-second"]);
    expect(result.missing).toBeNull();

    void Layer.empty;
  });
});
