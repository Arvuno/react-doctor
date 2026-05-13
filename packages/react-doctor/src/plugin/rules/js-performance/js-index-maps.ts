import { createLoopAwareVisitors, defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const jsIndexMaps = defineRule<Rule>({
  create: (context: RuleContext) =>
    createLoopAwareVisitors({
      CallExpression(node: EsTreeNode) {
        if (node.callee?.type !== "MemberExpression" || node.callee.property?.type !== "Identifier")
          return;
        const methodName = node.callee.property.name;
        if (methodName === "find" || methodName === "findIndex") {
          context.report({
            node,
            message: `array.${methodName}() in a loop is O(n*m) — build a Map for O(1) lookups`,
          });
        }
      },
    }),
});
