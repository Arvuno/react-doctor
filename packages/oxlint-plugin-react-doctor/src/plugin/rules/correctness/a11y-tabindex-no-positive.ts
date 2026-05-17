import { defineRule } from "../../utils/define-rule.js";
import type { Rule } from "../../utils/rule.js";
import type { RuleContext } from "../../utils/rule-context.js";
import type { EsTreeNodeOfType } from "../../utils/es-tree-node-of-type.js";
import { isNodeOfType } from "../../utils/is-node-of-type.js";
import { findJsxAttributeIgnoreCase } from "../../utils/find-jsx-attribute-ignore-case.js";

const MESSAGE = "Avoid positive `tabIndex` property values to synchronize the flow of the page with keyboard tab order. Use 0 or -1 instead.";

export const a11yTabindexNoPositive = defineRule<Rule>({
  id: "a11y-tabindex-no-positive",
  severity: "warn",
  recommendation: MESSAGE,
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNodeOfType<"JSXOpeningElement">) {
      const tabindexAttribute = findJsxAttributeIgnoreCase(node.attributes, "tabIndex");
      if (!tabindexAttribute) return;
      const value = tabindexAttribute.value;
      if (!value) return;
      if (isNodeOfType(value, "Literal") && typeof value.value === "number" && value.value > 0) {
        context.report({ node: tabindexAttribute, message: MESSAGE });
        return;
      }
      if (isNodeOfType(value, "Literal") && typeof value.value === "string") {
        const numericValue = Number(value.value);
        if (!Number.isNaN(numericValue) && numericValue > 0) {
          context.report({ node: tabindexAttribute, message: MESSAGE });
          return;
        }
      }
      if (isNodeOfType(value, "JSXExpressionContainer")) {
        const expression = value.expression;
        if (isNodeOfType(expression, "Literal") && typeof expression.value === "number" && expression.value > 0) {
          context.report({ node: tabindexAttribute, message: MESSAGE });
        }
      }
    },
  }),
});
