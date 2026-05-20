import {
  CANONICAL_GITHUB_URL,
  formatErrorChain,
  formatReactDoctorError,
  logger,
  type ReactDoctorError,
} from "@react-doctor/core";
import type { HandleErrorOptions } from "@react-doctor/types";

/**
 * Structural tag check — see `inspect.ts` for the full rationale
 * (vitest module isolation can produce different class identities
 * for `ReactDoctorError` at the catch site vs. the throw site, so
 * `instanceof` is unreliable and `_tag` is the structural contract
 * the runtime actually publishes).
 */
const isReactDoctorErrorLike = (cause: unknown): cause is ReactDoctorError =>
  typeof cause === "object" &&
  cause !== null &&
  (cause as { _tag?: unknown })._tag === "ReactDoctorError" &&
  typeof (cause as { reason?: { _tag?: unknown } }).reason === "object" &&
  (cause as { reason?: { _tag?: unknown } }).reason !== null;

/**
 * Renders any thrown value to the CLI as a one-line error
 * description. Tagged `ReactDoctorError`s defer to
 * `formatReactDoctorError` so the wording stays consistent with
 * what the JSON reporter / GitHub Action / future LSP would
 * produce; legacy `Error` causes (third-party plugin throws,
 * filesystem permission failures, etc.) fall back to the
 * cause-chain walk so users still see the underlying reason.
 */
export const handleError = (
  error: unknown,
  options: HandleErrorOptions = { shouldExit: true },
): void => {
  logger.break();
  logger.error("Something went wrong. Please check the error below for more details.");
  logger.error(`If the problem persists, please open an issue at ${CANONICAL_GITHUB_URL}/issues.`);
  logger.error("");
  logger.error(
    isReactDoctorErrorLike(error) ? formatReactDoctorError(error) : formatErrorChain(error),
  );
  logger.break();
  if (options.shouldExit) {
    process.exit(1);
  }
  process.exitCode = 1;
};
