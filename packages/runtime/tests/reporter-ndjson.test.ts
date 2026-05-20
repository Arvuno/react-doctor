import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vite-plus/test";
import { Effect } from "effect";

import type { Diagnostic } from "../src/diagnostic-schema.js";
import { Reporter } from "../src/reporter.js";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rd-runtime-ndjson-"));
afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

const makeDiagnostic = (overrides: Partial<Diagnostic> = {}): Diagnostic => ({
  filePath: "src/App.tsx",
  plugin: "react-doctor",
  rule: "no-secrets-in-client-code",
  severity: "error",
  message: "API key checked into client bundle",
  help: "Move the secret to server-only code",
  line: 1,
  column: 1,
  category: "Security",
  ...overrides,
});

describe("Reporter.layerNdjson", () => {
  it("encodes every emitted diagnostic as one JSON line at the wire boundary", async () => {
    const ndjsonPath = path.join(tempRoot, "diagnostics.jsonl");

    const program = Effect.gen(function* () {
      const reporter = yield* Reporter;
      yield* reporter.emit(makeDiagnostic({ line: 1 }));
      yield* reporter.emit(makeDiagnostic({ line: 2, severity: "warning" }));
      yield* reporter.emit(makeDiagnostic({ line: 3, rule: "use-stable-keys" }));
      yield* reporter.finalize;
    });

    await Effect.runPromise(program.pipe(Effect.provide(Reporter.layerNdjson(ndjsonPath))));

    const lines = fs
      .readFileSync(ndjsonPath, "utf8")
      .split("\n")
      .filter((line) => line.length > 0);
    expect(lines).toHaveLength(3);

    const decoded = lines.map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(decoded[0].line).toBe(1);
    expect(decoded[0].severity).toBe("error");
    expect(decoded[1].line).toBe(2);
    expect(decoded[1].severity).toBe("warning");
    expect(decoded[2].rule).toBe("use-stable-keys");
  });

  it("creates the parent directory if it doesn't exist (matches react-doctor-evals' .evals/<traceId>/ shape)", async () => {
    const nestedPath = path.join(tempRoot, "deep", "nested", "diagnostics.jsonl");

    const program = Effect.gen(function* () {
      const reporter = yield* Reporter;
      yield* reporter.emit(makeDiagnostic());
      yield* reporter.finalize;
    });

    await Effect.runPromise(program.pipe(Effect.provide(Reporter.layerNdjson(nestedPath))));
    expect(fs.existsSync(nestedPath)).toBe(true);
  });
});
