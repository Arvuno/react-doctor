import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Diagnostic } from "../../types.js";

export interface WriteDiagnosticsResult {
  outputDirectory: string;
  diagnosticsFilePath: string;
}

export interface WriteDiagnosticsOptions {
  mkdirImpl?: typeof mkdirSync;
  writeFileImpl?: typeof writeFileSync;
  tmpDirImpl?: () => string;
  uuidImpl?: () => string;
}

export const writeDiagnosticsToTempDir = (
  diagnostics: Diagnostic[],
  options: WriteDiagnosticsOptions = {},
): WriteDiagnosticsResult => {
  const mkdirImpl = options.mkdirImpl ?? mkdirSync;
  const writeFileImpl = options.writeFileImpl ?? writeFileSync;
  const tmpDirImpl = options.tmpDirImpl ?? tmpdir;
  const uuidImpl = options.uuidImpl ?? randomUUID;

  const outputDirectory = path.join(tmpDirImpl(), `react-doctor-${uuidImpl()}`);
  mkdirImpl(outputDirectory, { recursive: true });
  const diagnosticsFilePath = path.join(outputDirectory, "diagnostics.json");
  writeFileImpl(diagnosticsFilePath, JSON.stringify(diagnostics, null, 2), "utf8");
  return { outputDirectory, diagnosticsFilePath };
};
