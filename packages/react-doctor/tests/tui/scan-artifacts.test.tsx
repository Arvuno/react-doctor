import { describe, expect, it, vi } from "vite-plus/test";
import { render } from "ink-testing-library";
import { writeDiagnosticsToTempDir } from "../../src/tui/utils/write-diagnostics-to-temp-dir.js";
import { buildShareUrl } from "../../src/tui/utils/build-share-url.js";
import { ScanSummaryFooter } from "../../src/tui/components/scan-summary-footer.js";
import { Header } from "../../src/tui/components/header.js";
import { HelpOverlay } from "../../src/tui/components/help-overlay.js";
import { appReducer, buildInitialState } from "../../src/tui/store.js";
import type { AppState } from "../../src/tui/types.js";
import type { Diagnostic, ScoreResult } from "../../src/types.js";
import { stripAnsi } from "./strip-ansi.js";

const buildDiagnostic = (overrides: Partial<Diagnostic> = {}): Diagnostic => ({
  filePath: "/repo/src/App.tsx",
  plugin: "react-doctor",
  rule: "no-fetch-in-effect",
  severity: "error",
  message: "Avoid fetch inside useEffect.",
  help: "",
  line: 14,
  column: 1,
  category: "state-effects",
  ...overrides,
});

describe("writeDiagnosticsToTempDir", () => {
  it("creates a unique tmp directory and writes diagnostics.json into it", () => {
    const mkdirImpl = vi.fn() as unknown as typeof import("node:fs").mkdirSync;
    const writeFileImpl = vi.fn() as unknown as typeof import("node:fs").writeFileSync;
    const tmpDirImpl = () => "/tmp";
    const uuidImpl = () => "abc-123";
    const result = writeDiagnosticsToTempDir([buildDiagnostic(), buildDiagnostic({ line: 22 })], {
      mkdirImpl,
      writeFileImpl,
      tmpDirImpl,
      uuidImpl,
    });
    expect(result.outputDirectory).toBe("/tmp/react-doctor-abc-123");
    expect(result.diagnosticsFilePath).toBe("/tmp/react-doctor-abc-123/diagnostics.json");
    expect(mkdirImpl).toHaveBeenCalledWith("/tmp/react-doctor-abc-123", { recursive: true });
    expect(writeFileImpl).toHaveBeenCalledTimes(1);
    const writtenPayload = (writeFileImpl as unknown as { mock: { calls: unknown[][] } }).mock
      .calls[0][1] as string;
    expect(JSON.parse(writtenPayload)).toHaveLength(2);
  });
});

describe("buildShareUrl", () => {
  const baseScore: ScoreResult = { score: 82, label: "Great" };

  it("includes the project name and the score in the query string", () => {
    const url = buildShareUrl([], baseScore, "ami");
    expect(url).toContain("https://www.react.doctor/share");
    expect(url).toContain("p=ami");
    expect(url).toContain("s=82");
  });

  it("includes error / warning / file counts only when non-zero", () => {
    const diagnostics = [
      buildDiagnostic({ severity: "error", filePath: "/repo/a.tsx" }),
      buildDiagnostic({ severity: "warning", filePath: "/repo/b.tsx" }),
      buildDiagnostic({ severity: "warning", filePath: "/repo/b.tsx", line: 22 }),
    ];
    const url = buildShareUrl(diagnostics, baseScore, "ami");
    expect(url).toContain("e=1");
    expect(url).toContain("w=2");
    expect(url).toContain("f=2");
  });

  it("omits zero counts and the score parameter when no score is available", () => {
    const url = buildShareUrl([], null, "ami");
    expect(url).not.toContain("s=");
    expect(url).not.toContain("e=");
    expect(url).not.toContain("w=");
    expect(url).not.toContain("f=");
  });
});

describe("set-scan-artifacts reducer action", () => {
  it("starts with null artifacts", () => {
    const initial = buildInitialState("/repo");
    expect(initial.diagnosticsDirectory).toBeNull();
    expect(initial.shareUrl).toBeNull();
  });

  it("stores both fields when dispatched", () => {
    const initial = buildInitialState("/repo");
    const next = appReducer(initial, {
      type: "set-scan-artifacts",
      diagnosticsDirectory: "/tmp/react-doctor-abc-123",
      shareUrl: "https://www.react.doctor/share?p=ami&s=82",
    });
    expect(next.diagnosticsDirectory).toBe("/tmp/react-doctor-abc-123");
    expect(next.shareUrl).toBe("https://www.react.doctor/share?p=ami&s=82");
  });

  it("can clear both back to null", () => {
    const populated = appReducer(buildInitialState("/repo"), {
      type: "set-scan-artifacts",
      diagnosticsDirectory: "/tmp/react-doctor-abc-123",
      shareUrl: "https://www.react.doctor/share?p=ami&s=82",
    });
    const cleared = appReducer(populated, {
      type: "set-scan-artifacts",
      diagnosticsDirectory: null,
      shareUrl: null,
    });
    expect(cleared.diagnosticsDirectory).toBeNull();
    expect(cleared.shareUrl).toBeNull();
  });
});

describe("Header surfaces the home URL", () => {
  it("renders react.doctor on the right side at normal widths", () => {
    const { lastFrame } = render(<Header rootDirectory="/repo" terminalColumns={120} />);
    const frame = stripAnsi(lastFrame() ?? "");
    expect(frame).toContain("/repo");
    expect(frame).toContain("react.doctor");
  });

  it("hides react.doctor on very narrow terminals", () => {
    const { lastFrame } = render(<Header rootDirectory="/repo" terminalColumns={40} />);
    const frame = stripAnsi(lastFrame() ?? "");
    expect(frame).toContain("/repo");
    expect(frame).not.toContain("react.doctor");
  });
});

describe("ScanSummaryFooter surfaces the share URL and diagnostics directory", () => {
  const buildState = (overrides: Partial<AppState> = {}): AppState => ({
    ...buildInitialState("/repo"),
    diagnostics: [buildDiagnostic()],
    scanStatus: "complete",
    scanCount: 1,
    lastScanElapsedMs: 1500,
    score: { score: 82, label: "Great" },
    ...overrides,
  });

  it("shows the share URL and the diagnostics path when both are set", () => {
    const state = buildState({
      diagnosticsDirectory: "/tmp/react-doctor-abc-123",
      shareUrl: "https://www.react.doctor/share?p=ami&s=82",
    });
    const { lastFrame } = render(<ScanSummaryFooter state={state} />);
    const frame = stripAnsi(lastFrame() ?? "");
    expect(frame).toContain("Share your results: https://www.react.doctor/share?p=ami&s=82");
    expect(frame).toContain("Full diagnostics written to /tmp/react-doctor-abc-123");
  });

  it("omits both lines before the first scan completes", () => {
    const state = buildInitialState("/repo");
    const { lastFrame } = render(<ScanSummaryFooter state={state} />);
    expect(lastFrame() ?? "").toBe("");
  });

  it("omits the share line when shareUrl is null", () => {
    const state = buildState({
      diagnosticsDirectory: "/tmp/react-doctor-abc-123",
      shareUrl: null,
    });
    const { lastFrame } = render(<ScanSummaryFooter state={state} />);
    const frame = stripAnsi(lastFrame() ?? "");
    expect(frame).not.toContain("Share your results");
    expect(frame).toContain("Full diagnostics written to /tmp/react-doctor-abc-123");
  });
});

describe("HelpOverlay surfaces home and GitHub URLs", () => {
  it("renders both URLs at the bottom", () => {
    const { lastFrame } = render(<HelpOverlay />);
    const frame = stripAnsi(lastFrame() ?? "");
    expect(frame).toContain("https://react.doctor");
    expect(frame).toContain("https://github.com/millionco/react-doctor");
  });
});
