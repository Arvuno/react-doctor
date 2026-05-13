import { defineRule, isHookCall, isSimpleExpression } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

// Identifiers and member-access chains are technically "simple", but memoizing
// them is sometimes intentional (stable reference passing). Only flag arithmetic
// / literal trivial cases to keep false positives low.
const isTriviallyCheapExpression = (node: EsTreeNode | null): boolean => {
  if (!node) return false;
  if (!isSimpleExpression(node)) return false;
  if (node.type === "Identifier") return false;
  if (node.type === "MemberExpression") return false;
  return true;
};

export const noUsememoSimpleExpression = defineRule<Rule>({
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isHookCall(node, "useMemo")) return;

      const callback = node.arguments?.[0];
      if (!callback) return;
      if (callback.type !== "ArrowFunctionExpression" && callback.type !== "FunctionExpression")
        return;

      let returnExpression = null;
      if (callback.body?.type !== "BlockStatement") {
        returnExpression = callback.body;
      } else if (
        callback.body.body?.length === 1 &&
        callback.body.body[0].type === "ReturnStatement"
      ) {
        returnExpression = callback.body.body[0].argument;
      }

      if (returnExpression && isTriviallyCheapExpression(returnExpression)) {
        context.report({
          node,
          message:
            "useMemo wrapping a trivially cheap expression — memo overhead exceeds the computation",
        });
      }
    },
  }),
});
