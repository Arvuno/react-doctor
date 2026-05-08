import path from "node:path";
import { render } from "ink";
import {
  detectNonInteractiveEnvironment,
  type NonInteractiveDetection,
} from "../utils/is-non-interactive-environment.js";
import { maybePromptInstallSkill } from "../utils/maybe-prompt-install-skill.js";
import { App } from "./app.js";

export interface RunTuiOptions {
  directory: string;
  review?: boolean;
  project?: string;
}

interface TuiPreflightResult {
  ok: boolean;
  reason?: string;
  hint?: string;
}

const checkTuiPreflight = (
  envSource: NodeJS.ProcessEnv = process.env,
  isStdoutTty: boolean = Boolean(process.stdout.isTTY),
  isStdinTty: boolean = Boolean(process.stdin.isTTY),
): TuiPreflightResult => {
  if (!isStdoutTty || !isStdinTty) {
    return {
      ok: false,
      reason: "no interactive TTY (stdin or stdout is not a terminal)",
      hint: "Run `react-doctor tui` from a real terminal, or use `react-doctor` for non-interactive output.",
    };
  }
  const detection: NonInteractiveDetection = detectNonInteractiveEnvironment(envSource);
  if (detection.isNonInteractive) {
    return {
      ok: false,
      reason: `agent / CI environment detected (${detection.triggeringEnvVar} is set)`,
      hint: "The interactive TUI is disabled in coding-agent and CI sessions. Use `react-doctor` for non-interactive output, or `react-doctor --json` for a parseable report.",
    };
  }
  return { ok: true };
};

const writePreflightFailure = (preflight: TuiPreflightResult): void => {
  process.stderr.write(`react-doctor tui: ${preflight.reason ?? "preflight failed"}.\n`);
  if (preflight.hint) process.stderr.write(`${preflight.hint}\n`);
};

export { checkTuiPreflight };

export const runTui = async (options: RunTuiOptions): Promise<void> => {
  const preflight = checkTuiPreflight();
  if (!preflight.ok) {
    writePreflightFailure(preflight);
    process.exitCode = 1;
    return;
  }

  // HACK: prompt before Ink renders. Once Ink owns the TTY the standard
  // `prompts` library can't read keystrokes correctly, and the user would
  // be staring at a frozen confirm. The prompt is only shown once across
  // all react-doctor invocations (see first-run-state.ts).
  await maybePromptInstallSkill();

  const initialMode = options.review ? "review" : "dashboard";
  const renderInstance = render(
    <App
      rootDirectory={path.resolve(options.directory)}
      initialMode={initialMode}
      preselectedProject={options.project}
    />,
    { exitOnCtrlC: false },
  );
  await renderInstance.waitUntilExit();
};
