import { isTestlikeFilename } from "./is-testlike-filename.js";
import type { Rule } from "./rule.js";

interface DefineRule {
  (rule: Rule): Rule;
  <RuleDefinition>(rule: RuleDefinition): RuleDefinition;
}

// Rules tagged `"test-noise"` are by-design noisy in tests / stories /
// playgrounds — design-system style preferences, deprecated-API hints,
// auto-parallelizable awaits, etc. None of these apply to files that
// don't ship to users. We wrap `create()` once here so every such rule
// auto-skips testlike files without each one re-implementing the check.
const wrapCreateForTestNoise = <CreateFn extends (context: { getFilename?: () => string | undefined }) => Record<string, unknown>>(
  create: CreateFn,
): CreateFn =>
  ((context) => {
    const visitors = create(context);
    if (!isTestlikeFilename(context.getFilename?.())) return visitors;
    // No visitors → rule fires nothing for this file.
    return {};
  }) as CreateFn;

export const defineRule: DefineRule = <RuleDefinition>(
  rule: RuleDefinition,
): RuleDefinition => {
  const tags = (rule as { tags?: ReadonlyArray<string> }).tags;
  if (!tags || !tags.includes("test-noise")) return rule;
  const create = (rule as { create?: unknown }).create;
  if (typeof create !== "function") return rule;
  return {
    ...rule,
    create: wrapCreateForTestNoise(create as never),
  } as RuleDefinition;
};
