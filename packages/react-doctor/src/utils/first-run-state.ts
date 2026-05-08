import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export interface FirstRunState {
  skillPromptShownAt?: number;
  skillPromptDeclinedAt?: number;
}

const STATE_FILE_NAME = "state.json";

const PACKAGE_DIRECTORY_NAME = "react-doctor";

// HACK: prefer XDG_STATE_HOME for transient program state per the XDG Base
// Directory spec, then XDG_CONFIG_HOME, then fall back to ~/.config so
// macOS users (where neither var is usually set) get a predictable path.
export const resolveStateFilePath = (
  envSource: NodeJS.ProcessEnv = process.env,
  homeDirectory: string = os.homedir(),
): string => {
  const stateHome = envSource.XDG_STATE_HOME?.trim();
  if (stateHome && stateHome.length > 0) {
    return path.join(stateHome, PACKAGE_DIRECTORY_NAME, STATE_FILE_NAME);
  }
  const configHome = envSource.XDG_CONFIG_HOME?.trim();
  if (configHome && configHome.length > 0) {
    return path.join(configHome, PACKAGE_DIRECTORY_NAME, STATE_FILE_NAME);
  }
  return path.join(homeDirectory, ".config", PACKAGE_DIRECTORY_NAME, STATE_FILE_NAME);
};

export interface FirstRunStateIo {
  readFileImpl?: typeof readFileSync;
  writeFileImpl?: typeof writeFileSync;
  mkdirImpl?: typeof mkdirSync;
  envSource?: NodeJS.ProcessEnv;
  homeDirectory?: string;
}

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const readFirstRunState = (io: FirstRunStateIo = {}): FirstRunState => {
  const filePath = resolveStateFilePath(io.envSource, io.homeDirectory);
  const readFileImpl = io.readFileImpl ?? readFileSync;
  try {
    const raw = readFileImpl(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainRecord(parsed)) return {};
    const result: FirstRunState = {};
    if (typeof parsed.skillPromptShownAt === "number") {
      result.skillPromptShownAt = parsed.skillPromptShownAt;
    }
    if (typeof parsed.skillPromptDeclinedAt === "number") {
      result.skillPromptDeclinedAt = parsed.skillPromptDeclinedAt;
    }
    return result;
  } catch {
    return {};
  }
};

export const writeFirstRunState = (
  state: FirstRunState,
  io: FirstRunStateIo = {},
): { ok: boolean; filePath?: string; error?: string } => {
  const filePath = resolveStateFilePath(io.envSource, io.homeDirectory);
  const mkdirImpl = io.mkdirImpl ?? mkdirSync;
  const writeFileImpl = io.writeFileImpl ?? writeFileSync;
  try {
    mkdirImpl(path.dirname(filePath), { recursive: true });
    writeFileImpl(filePath, JSON.stringify(state, null, 2), "utf8");
    return { ok: true, filePath };
  } catch (writeError) {
    return { ok: false, error: (writeError as Error)?.message ?? "unknown error" };
  }
};

export const hasShownSkillPrompt = (state: FirstRunState): boolean =>
  typeof state.skillPromptShownAt === "number" && state.skillPromptShownAt > 0;
