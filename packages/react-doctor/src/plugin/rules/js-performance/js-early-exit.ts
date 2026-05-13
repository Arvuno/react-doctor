import { DEEP_NESTING_THRESHOLD } from "../../constants.js";
import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const jsEarlyExit = defineRule<Rule>({
  create: (context: RuleContext) => ({
    IfStatement(node: EsTreeNode) {
      if (node.consequent?.type !== "BlockStatement" || !node.consequent.body) return;

      let nestingDepth = 0;
      let currentBlock = node.consequent;
      while (currentBlock?.type === "BlockStatement" && currentBlock.body?.length === 1) {
        const innerStatement = currentBlock.body[0];
        if (innerStatement.type !== "IfStatement") break;
        nestingDepth++;
        currentBlock = innerStatement.consequent;
      }

      if (nestingDepth >= DEEP_NESTING_THRESHOLD) {
        context.report({
          node,
          message: `${nestingDepth + 1} levels of nested if statements — use early returns to flatten`,
        });
      }
    },
  }),
});
