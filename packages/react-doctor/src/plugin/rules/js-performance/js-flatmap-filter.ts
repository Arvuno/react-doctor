import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const jsFlatmapFilter = defineRule<Rule>({
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (node.callee?.type !== "MemberExpression" || node.callee.property?.type !== "Identifier")
        return;

      const outerMethod = node.callee.property.name;
      if (outerMethod !== "filter") return;

      const filterArgument = node.arguments?.[0];
      if (!filterArgument) return;

      const isIdentityArrow =
        filterArgument.type === "ArrowFunctionExpression" &&
        filterArgument.params?.length === 1 &&
        filterArgument.body?.type === "Identifier" &&
        filterArgument.params[0]?.type === "Identifier" &&
        filterArgument.body.name === filterArgument.params[0].name;

      const isFilterBoolean =
        (filterArgument.type === "Identifier" && filterArgument.name === "Boolean") ||
        isIdentityArrow;

      if (!isFilterBoolean) return;

      const innerCall = node.callee.object;
      if (
        innerCall?.type !== "CallExpression" ||
        innerCall.callee?.type !== "MemberExpression" ||
        innerCall.callee.property?.type !== "Identifier"
      )
        return;

      const innerMethod = innerCall.callee.property.name;
      if (innerMethod !== "map") return;

      context.report({
        node,
        message:
          ".map().filter(Boolean) iterates twice — use .flatMap() to transform and filter in a single pass",
      });
    },
  }),
});
