import { defineRule } from "../../utils/define-rule.js";
import type { Rule } from "../../utils/rule.js";
import type { RuleContext } from "../../utils/rule-context.js";
import { isNodeOfType } from "../../utils/is-node-of-type.js";
import type { EsTreeNodeOfType } from "../../utils/es-tree-node-of-type.js";

export const jsFlatmapFilter = defineRule<Rule>({
  id: "js-flatmap-filter",
  severity: "warn",
  recommendation:
    "Use `.flatMap(item => condition ? [value] : [])` — transforms and filters in a single pass instead of creating an intermediate array",
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNodeOfType<"CallExpression">) {
      if (
        !isNodeOfType(node.callee, "MemberExpression") ||
        !isNodeOfType(node.callee.property, "Identifier")
      )
        return;

      const outerMethod = node.callee.property.name;
      if (outerMethod !== "filter") return;

      const filterArgument = node.arguments?.[0];
      if (!filterArgument) return;

      const isIdentityArrow =
        isNodeOfType(filterArgument, "ArrowFunctionExpression") &&
        filterArgument.params?.length === 1 &&
        isNodeOfType(filterArgument.body, "Identifier") &&
        isNodeOfType(filterArgument.params[0], "Identifier") &&
        filterArgument.body.name === filterArgument.params[0].name;

      const isFilterBoolean =
        (isNodeOfType(filterArgument, "Identifier") && filterArgument.name === "Boolean") ||
        isIdentityArrow;

      if (!isFilterBoolean) return;

      const innerCall = node.callee.object;
      if (
        !isNodeOfType(innerCall, "CallExpression") ||
        !isNodeOfType(innerCall.callee, "MemberExpression") ||
        !isNodeOfType(innerCall.callee.property, "Identifier")
      )
        return;

      const innerMethod = innerCall.callee.property.name;
      if (innerMethod !== "map") return;

      // `[a, b, c].map(...).filter(Boolean)` — iterating an 8-element-
      // or-fewer literal twice is trivial cost; the flatMap rewrite
      // here is pure ceremony.
      const SMALL_LITERAL_ARRAY_MAX = 8;
      let receiver: EsTreeNode | null | undefined = innerCall.callee.object;
      if (receiver && isNodeOfType(receiver, "ArrayExpression")) {
        const elements = receiver.elements ?? [];
        if (
          elements.length > 0 &&
          elements.length <= SMALL_LITERAL_ARRAY_MAX &&
          elements.every((el) => el == null || !isNodeOfType(el, "SpreadElement"))
        ) {
          return;
        }
      }

      context.report({
        node,
        message:
          ".map().filter(Boolean) iterates twice — use .flatMap() to transform and filter in a single pass",
      });
    },
  }),
});
