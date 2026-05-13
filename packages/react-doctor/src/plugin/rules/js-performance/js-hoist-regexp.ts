import { createLoopAwareVisitors, defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const jsHoistRegexp = defineRule<Rule>({
  create: (context: RuleContext) =>
    createLoopAwareVisitors({
      NewExpression(node: EsTreeNode) {
        if (node.callee?.type === "Identifier" && node.callee.name === "RegExp") {
          context.report({
            node,
            message: "new RegExp() inside a loop — hoist to a module-level constant",
          });
        }
      },
    }),
});
