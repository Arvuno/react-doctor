import { defineRule, isMemberProperty } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const jsTosortedImmutable = defineRule<Rule>({
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isMemberProperty(node.callee, "sort")) return;

      const receiver = node.callee.object;
      if (
        receiver?.type === "ArrayExpression" &&
        receiver.elements?.length === 1 &&
        receiver.elements[0]?.type === "SpreadElement"
      ) {
        context.report({
          node,
          message: "[...array].sort() — use array.toSorted() for immutable sorting (ES2023)",
        });
      }
    },
  }),
});
