import { SKILL_NAME } from "../constants.js";
import { runInstallSkill } from "../install-skill.js";
import { detectAvailableAgents } from "./detect-agents.js";
import { hasShownSkillPrompt, readFirstRunState, writeFirstRunState } from "./first-run-state.js";
import { highlighter } from "./highlighter.js";
import { isNonInteractiveEnvironment } from "./is-non-interactive-environment.js";
import { logger } from "./logger.js";
import { prompts } from "./prompts.js";
import { toDisplayName } from "./to-display-name.js";

export interface MaybePromptInstallOptions {
  isInteractiveTty?: boolean;
  isCleanlyInteractive?: boolean;
}

interface PromptResult {
  shown: boolean;
  installed: boolean;
}

const MIN_AGENTS_TO_PROMPT = 1;

export const maybePromptInstallSkill = async (
  options: MaybePromptInstallOptions = {},
): Promise<PromptResult> => {
  const isInteractiveTty =
    options.isInteractiveTty ?? (Boolean(process.stdin.isTTY) && Boolean(process.stdout.isTTY));
  const isCleanlyInteractive = options.isCleanlyInteractive ?? !isNonInteractiveEnvironment();

  if (!isInteractiveTty || !isCleanlyInteractive) return { shown: false, installed: false };

  const state = readFirstRunState();
  if (hasShownSkillPrompt(state)) return { shown: false, installed: false };

  const detectedAgents = await detectAvailableAgents();
  if (detectedAgents.length < MIN_AGENTS_TO_PROMPT) {
    return { shown: false, installed: false };
  }

  const agentsLabel = detectedAgents.map(toDisplayName).join(", ");
  logger.log(
    `Teach your ${highlighter.info(agentsLabel)} agent ${highlighter.info(
      `${SKILL_NAME}`,
    )} so it stops writing the bad code in the first place.`,
  );

  let didInstall = false;
  try {
    const { shouldInstall } = await prompts({
      type: "confirm",
      name: "shouldInstall",
      message: `Install the ${highlighter.info(SKILL_NAME)} skill now?`,
      initial: true,
    });
    if (shouldInstall) {
      await runInstallSkill({ yes: true, detectedAgents });
      didInstall = true;
    } else {
      logger.dim(`Skipped. Run ${highlighter.info("react-doctor install")} any time to add it.`);
    }
  } catch (promptError) {
    // HACK: if the prompt is cancelled (Ctrl-C / Esc) we still mark the
    // run as 'shown' so the user isn't asked again on every invocation.
    // The cancellation reaches the rest of the CLI naturally — prompts
    // sets process.exitCode in that path and we just return.
    logger.dim(
      `Skill install prompt cancelled (${(promptError as Error)?.message ?? "user cancelled"}).`,
    );
  } finally {
    const writeResult = writeFirstRunState({ ...state, skillPromptShownAt: Date.now() }, {});
    if (!writeResult.ok) {
      logger.dim(`(Could not record skill-prompt state: ${writeResult.error ?? "unknown error"}.)`);
    }
    logger.break();
  }
  return { shown: true, installed: didInstall };
};
