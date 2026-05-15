import type { PackageJson } from "@react-doctor/types";
import { parseReactMajor } from "./parse-react-major.js";
import { peerRangeMinMajor } from "./parse-react-peer-range.js";

export const resolveEffectiveReactMajor = (
  reactVersion: string | null,
  packageJson: PackageJson,
): number | null => {
  const installedReactMajor = parseReactMajor(reactVersion);
  const peerReactRange = packageJson.peerDependencies?.react;
  if (typeof peerReactRange !== "string") return installedReactMajor;

  const peerFloor = peerRangeMinMajor(peerReactRange);
  if (peerFloor === null) return null;
  return installedReactMajor !== null ? Math.min(installedReactMajor, peerFloor) : peerFloor;
};
