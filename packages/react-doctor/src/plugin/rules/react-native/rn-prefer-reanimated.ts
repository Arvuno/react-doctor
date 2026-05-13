import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const rnPreferReanimated = defineRule<Rule>({
  create: (context: RuleContext) => ({
    ImportDeclaration(node: EsTreeNode) {
      if (node.source?.value !== "react-native") return;

      for (const specifier of node.specifiers ?? []) {
        if (specifier.type !== "ImportSpecifier") continue;
        if (specifier.imported?.name !== "Animated") continue;

        context.report({
          node: specifier,
          message:
            "Animated from react-native runs animations on the JS thread — use react-native-reanimated for performant UI-thread animations",
        });
      }
    },
  }),
});
