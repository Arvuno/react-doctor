import path from "node:path";
import { Context, Effect, Layer } from "effect";
import {
  createNodeReadFileLinesSync,
  listSourceFiles as listSourceFilesNode,
} from "@react-doctor/core";
import { isDirectory as isDirectoryNode, isFile as isFileNode } from "@react-doctor/project-info";

/**
 * `Files` is the runtime's filesystem-shaped service: every read,
 * stat, or directory walk that the diagnostic pipeline needs goes
 * through it. Two production-shaped layers + an in-memory test
 * layer so the rest of the pipeline can be exercised without temp
 * dirs.
 *
 * The scope is intentionally narrow — the runtime doesn't need a
 * full FS abstraction, it needs the four primitives that
 * `combineDiagnostics`, `runOxlint`, and the project / config
 * resolvers actually call. Adding a new primitive (e.g. a
 * `glob`-style listing for incremental mode) becomes one extra
 * method here, not a rewrite of every call site.
 */
export class Files extends Context.Service<
  Files,
  {
    readonly readLines: (
      filePath: string,
      rootDirectory: string,
    ) => Effect.Effect<ReadonlyArray<string> | null>;
    readonly listSourceFiles: (rootDirectory: string) => Effect.Effect<ReadonlyArray<string>>;
    readonly isFile: (filePath: string) => Effect.Effect<boolean>;
    readonly isDirectory: (filePath: string) => Effect.Effect<boolean>;
  }
>()("@react-doctor/runtime/Files") {
  /**
   * Real Node.js filesystem layer. Delegates to the existing
   * `@react-doctor/core` and `@react-doctor/project-info` helpers —
   * the legacy paths stay the source of truth for fast `git
   * ls-files` resolution, ignored-directory walking, and
   * encoding handling, and `Files.layerNode` is the one boundary
   * where the runtime crosses into them.
   */
  static readonly layerNode = Layer.succeed(
    Files,
    Files.of({
      readLines: (filePath, rootDirectory) =>
        Effect.sync(() => createNodeReadFileLinesSync(rootDirectory)(filePath)),
      listSourceFiles: (rootDirectory) => Effect.sync(() => listSourceFilesNode(rootDirectory)),
      isFile: (filePath) => Effect.sync(() => isFileNode(filePath)),
      isDirectory: (filePath) => Effect.sync(() => isDirectoryNode(filePath)),
    }),
  );

  /**
   * Test layer backed by a `Map<absolutePath, content>` of file
   * contents. Tree entries with no `content` (an empty string is
   * fine for "exists but empty") are treated as missing for read
   * purposes; directory existence is implied by any descendant
   * file path. Mirrors the in-memory FS pattern in
   * react-doctor-evals' test layers.
   */
  static readonly layerInMemory = (tree: ReadonlyMap<string, string>): Layer.Layer<Files> => {
    const resolveAbsolute = (filePath: string, rootDirectory: string): string =>
      path.isAbsolute(filePath) ? filePath : path.join(rootDirectory, filePath);

    return Layer.succeed(
      Files,
      Files.of({
        readLines: (filePath, rootDirectory) =>
          Effect.sync(() => {
            const absolute = resolveAbsolute(filePath, rootDirectory);
            const content = tree.get(absolute);
            return content === undefined ? null : content.split("\n");
          }),
        listSourceFiles: (rootDirectory) =>
          Effect.sync(() => {
            const prefix = rootDirectory.endsWith(path.sep)
              ? rootDirectory
              : `${rootDirectory}${path.sep}`;
            const files: string[] = [];
            for (const absolute of tree.keys()) {
              if (!absolute.startsWith(prefix)) continue;
              files.push(absolute.slice(prefix.length).replace(/\\/g, "/"));
            }
            return files;
          }),
        isFile: (filePath) => Effect.sync(() => tree.has(filePath)),
        isDirectory: (filePath) =>
          Effect.sync(() => {
            const prefix = filePath.endsWith(path.sep) ? filePath : `${filePath}${path.sep}`;
            for (const absolute of tree.keys()) {
              if (absolute === filePath || absolute.startsWith(prefix)) return true;
            }
            return false;
          }),
      }),
    );
  };
}

/**
 * Builds a synchronous file-line lookup closure with the same
 * shape `combineDiagnostics` and the legacy suppression evaluator
 * already consume. Lets the streaming pipeline hand a
 * `Files`-driven reader to the array-shaped legacy code while the
 * stream-friendly operators below use the Effect-returning
 * `Files.readLines` directly.
 */
export const buildSyncReadFileLines = (
  files: Files["Service"],
  rootDirectory: string,
): ((filePath: string) => string[] | null) => {
  return (filePath: string): string[] | null => {
    const result = Effect.runSync(files.readLines(filePath, rootDirectory));
    return result === null ? null : [...result];
  };
};
