import { describe, expect, it, vi } from "vite-plus/test";
import {
  hasShownSkillPrompt,
  readFirstRunState,
  resolveStateFilePath,
  writeFirstRunState,
} from "../../src/utils/first-run-state.js";

describe("resolveStateFilePath", () => {
  it("prefers $XDG_STATE_HOME when set", () => {
    const filePath = resolveStateFilePath({ XDG_STATE_HOME: "/run/state" }, "/home/me");
    expect(filePath).toBe("/run/state/react-doctor/state.json");
  });

  it("falls back to $XDG_CONFIG_HOME when state home is unset", () => {
    const filePath = resolveStateFilePath({ XDG_CONFIG_HOME: "/cfg" }, "/home/me");
    expect(filePath).toBe("/cfg/react-doctor/state.json");
  });

  it("falls back to ~/.config/react-doctor/state.json by default", () => {
    const filePath = resolveStateFilePath({}, "/home/me");
    expect(filePath).toBe("/home/me/.config/react-doctor/state.json");
  });

  it("treats whitespace-only XDG values as unset", () => {
    const filePath = resolveStateFilePath(
      { XDG_STATE_HOME: "   ", XDG_CONFIG_HOME: "" },
      "/home/me",
    );
    expect(filePath).toBe("/home/me/.config/react-doctor/state.json");
  });
});

describe("readFirstRunState", () => {
  it("returns an empty object when no state file exists", () => {
    const readFileImpl = vi.fn(() => {
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    }) as unknown as typeof import("node:fs").readFileSync;
    expect(
      readFirstRunState({
        envSource: { XDG_STATE_HOME: "/x" },
        homeDirectory: "/h",
        readFileImpl,
      }),
    ).toEqual({});
  });

  it("ignores malformed JSON", () => {
    const readFileImpl = vi.fn(
      () => "not json",
    ) as unknown as typeof import("node:fs").readFileSync;
    expect(
      readFirstRunState({
        envSource: { XDG_STATE_HOME: "/x" },
        homeDirectory: "/h",
        readFileImpl,
      }),
    ).toEqual({});
  });

  it("only keeps numeric known fields", () => {
    const readFileImpl = vi.fn(() =>
      JSON.stringify({
        skillPromptShownAt: 12345,
        skillPromptDeclinedAt: "yesterday",
        unknownField: true,
      }),
    ) as unknown as typeof import("node:fs").readFileSync;
    expect(
      readFirstRunState({
        envSource: { XDG_STATE_HOME: "/x" },
        homeDirectory: "/h",
        readFileImpl,
      }),
    ).toEqual({ skillPromptShownAt: 12345 });
  });
});

describe("writeFirstRunState", () => {
  it("creates the parent directory and writes JSON to the resolved path", () => {
    const mkdirImpl = vi.fn() as unknown as typeof import("node:fs").mkdirSync;
    const writeFileImpl = vi.fn() as unknown as typeof import("node:fs").writeFileSync;
    const result = writeFirstRunState(
      { skillPromptShownAt: 99 },
      {
        envSource: { XDG_STATE_HOME: "/x" },
        homeDirectory: "/h",
        mkdirImpl,
        writeFileImpl,
      },
    );
    expect(result.ok).toBe(true);
    expect(result.filePath).toBe("/x/react-doctor/state.json");
    expect(mkdirImpl).toHaveBeenCalledWith("/x/react-doctor", { recursive: true });
    expect(writeFileImpl).toHaveBeenCalledWith(
      "/x/react-doctor/state.json",
      JSON.stringify({ skillPromptShownAt: 99 }, null, 2),
      "utf8",
    );
  });

  it("returns ok=false with the error when the write throws", () => {
    const mkdirImpl = vi.fn() as unknown as typeof import("node:fs").mkdirSync;
    const writeFileImpl = vi.fn(() => {
      throw new Error("disk full");
    }) as unknown as typeof import("node:fs").writeFileSync;
    const result = writeFirstRunState(
      { skillPromptShownAt: 99 },
      {
        envSource: { XDG_STATE_HOME: "/x" },
        homeDirectory: "/h",
        mkdirImpl,
        writeFileImpl,
      },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toContain("disk full");
  });
});

describe("hasShownSkillPrompt", () => {
  it("returns false when the timestamp is missing", () => {
    expect(hasShownSkillPrompt({})).toBe(false);
  });

  it("returns true when the timestamp is set", () => {
    expect(hasShownSkillPrompt({ skillPromptShownAt: 12345 })).toBe(true);
  });

  it("rejects zero / negative timestamps", () => {
    expect(hasShownSkillPrompt({ skillPromptShownAt: 0 })).toBe(false);
  });
});
