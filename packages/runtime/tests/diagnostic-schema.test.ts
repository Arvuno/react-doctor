import { describe, expect, it } from "vite-plus/test";
import { Schema } from "effect";

import { Diagnostic, buildDiagnosticIdentity } from "../src/diagnostic-schema.js";

const decodeDiagnostic = Schema.decodeUnknownSync(Diagnostic);

describe("Diagnostic schema (effect/Schema)", () => {
  it("decodes a well-formed wire payload to a typed value", () => {
    const decoded = decodeDiagnostic({
      filePath: "src/App.tsx",
      plugin: "react-doctor",
      rule: "no-secrets-in-client-code",
      severity: "error",
      message: "API key checked into client bundle",
      help: "Move the secret to server-only code",
      url: "https://react-doctor.dev/rules/no-secrets-in-client-code",
      line: 42,
      column: 7,
      category: "Security",
    });

    expect(decoded.severity).toBe("error");
    expect(decoded.line).toBe(42);
  });

  it("rejects an unknown severity at the boundary instead of trusting the field", () => {
    expect(() =>
      decodeDiagnostic({
        filePath: "src/App.tsx",
        plugin: "react-doctor",
        rule: "x",
        severity: "fatal",
        message: "",
        help: "",
        line: 1,
        column: 1,
        category: "Other",
      }),
    ).toThrow();
  });

  it("derives a stable, deterministic identity per diagnostic", () => {
    const diagnostic = decodeDiagnostic({
      filePath: "packages/web/src/Button.tsx",
      plugin: "react-doctor",
      rule: "use-stable-keys",
      severity: "warning",
      message: "",
      help: "",
      line: 18,
      column: 4,
      category: "Correctness",
    });

    expect(buildDiagnosticIdentity(diagnostic)).toBe(
      "packages/web/src/Button.tsx::18:4::react-doctor/use-stable-keys",
    );
  });
});
