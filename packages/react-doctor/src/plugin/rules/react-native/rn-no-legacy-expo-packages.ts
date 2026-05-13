import { LEGACY_EXPO_PACKAGE_REPLACEMENTS } from "../../constants.js";
import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const rnNoLegacyExpoPackages = defineRule<Rule>({
  create: (context: RuleContext) => ({
    ImportDeclaration(node: EsTreeNode) {
      const source = node.source?.value;
      if (typeof source !== "string") return;

      for (const [packageName, replacement] of LEGACY_EXPO_PACKAGE_REPLACEMENTS) {
        if (source === packageName || source.startsWith(`${packageName}/`)) {
          context.report({
            node,
            message: `"${packageName}" is deprecated — use ${replacement}`,
          });
          return;
        }
      }
    },
  }),
});
