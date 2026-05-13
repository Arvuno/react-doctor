import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const noEval = defineRule<Rule>({
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (node.callee?.type === "Identifier" && node.callee.name === "eval") {
        context.report({
          node,
          message: "eval() is a code injection risk — avoid dynamic code execution",
        });
        return;
      }

      if (
        node.callee?.type === "Identifier" &&
        (node.callee.name === "setTimeout" || node.callee.name === "setInterval") &&
        node.arguments?.[0]?.type === "Literal" &&
        typeof node.arguments[0].value === "string"
      ) {
        context.report({
          node,
          message: `${node.callee.name}() with string argument executes code dynamically — use a function instead`,
        });
      }
    },
    NewExpression(node: EsTreeNode) {
      if (node.callee?.type === "Identifier" && node.callee.name === "Function") {
        context.report({
          node,
          message: "new Function() is a code injection risk — avoid dynamic code execution",
        });
      }
    },
  }),
});
