import { describe, expect, it } from "vite-plus/test";
import { Schema } from "effect";

import { JsonReport } from "../src/json-report-schema.js";

const decodeJsonReport = Schema.decodeUnknownSync(JsonReport);

describe("JsonReport schema (Schema.Union for evolution)", () => {
  it("decodes a complete v1 report", () => {
    const report = decodeJsonReport({
      schemaVersion: 1,
      version: "0.2.1",
      ok: true,
      directory: "/repo",
      mode: "full",
      diff: null,
      projects: [],
      diagnostics: [],
      summary: {
        errorCount: 0,
        warningCount: 0,
        affectedFileCount: 0,
        totalDiagnosticCount: 0,
        score: 100,
        scoreLabel: "great",
      },
      elapsedMilliseconds: 1234,
      error: null,
    });

    expect(report.schemaVersion).toBe(1);
    expect(report.summary.score).toBe(100);
  });

  it("rejects a wire payload missing the schemaVersion discriminator", () => {
    expect(() =>
      decodeJsonReport({
        version: "0.2.1",
        ok: true,
        directory: "/repo",
        mode: "full",
        diff: null,
        projects: [],
        diagnostics: [],
        summary: {
          errorCount: 0,
          warningCount: 0,
          affectedFileCount: 0,
          totalDiagnosticCount: 0,
          score: null,
          scoreLabel: null,
        },
        elapsedMilliseconds: 0,
        error: null,
      }),
    ).toThrow();
  });
});
