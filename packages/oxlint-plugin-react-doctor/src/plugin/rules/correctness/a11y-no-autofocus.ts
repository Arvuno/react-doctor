import { defineRule } from "../../utils/define-rule.js";
import type { Rule } from "../../utils/rule.js";
import type { RuleContext } from "../../utils/rule-context.js";
import type { EsTreeNodeOfType } from "../../utils/es-tree-node-of-type.js";
import { isNodeOfType } from "../../utils/is-node-of-type.js";
import { findJsxAttribute } from "../../utils/find-jsx-attribute.js";

const MESSAGE =
  "The `autoFocus` attribute can cause usability issues for sighted and non-sighted users. Remove the `autoFocus` attribute.";

const isFalseValue = (attribute: EsTreeNodeOfType<"JSXAttribute">): boolean => {
  const value = attribute.value;
  if (!value) return false;
  if (isNodeOfType(value, "Literal") && value.value === "false") return true;
  if (isNodeOfType(value, "JSXExpressionContainer")) {
    const expression = value.expression;
    if (isNodeOfType(expression, "Literal")) {
      if (expression.value === false) return true;
      if (expression.value === "false") return true;
    }
    if (
      isNodeOfType(expression, "TemplateLiteral") &&
      expression.expressions?.length === 0 &&
      expression.quasis?.length === 1
    ) {
      const rawValue = expression.quasis[0]?.value?.cooked ?? expression.quasis[0]?.value?.raw;
      if (rawValue === "false") return true;
    }
  }
  return false;
};

export const a11yNoAutofocus = defineRule<Rule>({
  id: "a11y-no-autofocus",
  severity: "warn",
  recommendation: MESSAGE,
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNodeOfType<"JSXOpeningElement">) {
      const autofocusAttribute = findJsxAttribute(node.attributes, "autoFocus");
      if (!autofocusAttribute) return;
      if (isFalseValue(autofocusAttribute)) return;
      context.report({ node: autofocusAttribute, message: MESSAGE });
    },
  }),
});
