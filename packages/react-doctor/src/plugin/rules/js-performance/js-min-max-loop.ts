import { defineRule, isMemberProperty } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const jsMinMaxLoop = defineRule<Rule>({
  create: (context: RuleContext) => ({
    MemberExpression(node: EsTreeNode) {
      if (!node.computed) return;

      const object = node.object;
      if (object?.type !== "CallExpression" || !isMemberProperty(object.callee, "sort")) return;

      const isFirstElement = node.property?.type === "Literal" && node.property.value === 0;
      const isLastElement =
        node.property?.type === "BinaryExpression" &&
        node.property.operator === "-" &&
        node.property.right?.type === "Literal" &&
        node.property.right.value === 1;

      if (isFirstElement || isLastElement) {
        const targetFunction = isFirstElement ? "min" : "max";
        context.report({
          node,
          message: `array.sort()[${isFirstElement ? "0" : "length-1"}] for min/max — use Math.${targetFunction}(...array) instead (O(n) vs O(n log n))`,
        });
      }
    },
  }),
});
