import path from "node:path";
import { describe, expect, it, vi } from "vite-plus/test";
import { scan } from "../src/scan.js";
import type { ScanEvent, ScanReporter } from "../src/types.js";

const FIXTURES_DIRECTORY = path.resolve(import.meta.dirname, "fixtures");

vi.mock("ora", () => ({
  default: () => ({
    text: "",
    start: function () {
      return this;
    },
    stop: function () {
      return this;
    },
    succeed: () => {},
    fail: () => {},
  }),
}));

describe("scan reporter", () => {
  it("emits structured events for a valid React project", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const events: ScanEvent[] = [];
    const reporter: ScanReporter = {
      emit: (event) => {
        events.push(event);
      },
    };

    try {
      await scan(path.join(FIXTURES_DIRECTORY, "basic-react"), {
        lint: false,
        deadCode: false,
        offline: true,
        silent: true,
        reporter,
      });
    } finally {
      consoleSpy.mockRestore();
    }

    const eventTypes = events.map((event) => event.type);
    expect(eventTypes).toContain("project-detected");
    expect(eventTypes).toContain("score-resolved");
    expect(eventTypes).toContain("complete");

    const completeEvent = events.find((event) => event.type === "complete");
    expect(completeEvent).toBeDefined();
    if (completeEvent && completeEvent.type === "complete") {
      expect(completeEvent.result.project.framework).toBeTruthy();
      expect(completeEvent.result.diagnostics).toBeDefined();
    }
  });

  it("does not allow a throwing reporter to crash the scan", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const reporter: ScanReporter = {
      emit: () => {
        throw new Error("reporter exploded");
      },
    };

    try {
      await scan(path.join(FIXTURES_DIRECTORY, "basic-react"), {
        lint: false,
        deadCode: false,
        offline: true,
        silent: false,
        reporter,
      });
    } finally {
      consoleSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    }
  });
});
