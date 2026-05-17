import { defineRule } from "../../utils/define-rule.js";
import type { Rule } from "../../utils/rule.js";
import type { RuleContext } from "../../utils/rule-context.js";
import type { EsTreeNodeOfType } from "../../utils/es-tree-node-of-type.js";
import { isNodeOfType } from "../../utils/is-node-of-type.js";
import { getJsxElementName } from "../../utils/get-jsx-element-name.js";
import { findJsxAttributeIgnoreCase } from "../../utils/find-jsx-attribute-ignore-case.js";
import { isJsxAttributeValueTruthy, hasSpreadAttribute } from "../../utils/jsx-a11y-helpers.js";

const MESSAGE =
  "A form label must be associated with a control. Ensure the label has an `htmlFor` attribute, wraps a form control, or has an `aria-label` or `aria-labelledby` attribute.";

const CONTROL_ELEMENTS = new Set(["input", "meter", "output", "progress", "select", "textarea"]);

const hasNestedControl = (children: EsTreeNodeOfType<"JSXElement">["children"]): boolean => {
  if (!children) return false;
  for (const child of children) {
    if (isNodeOfType(child, "JSXElement") && child.openingElement) {
      const childTagName = getJsxElementName(child.openingElement);
      if (CONTROL_ELEMENTS.has(childTagName)) return true;
      if (/^[A-Z]/.test(childTagName)) return true;
      if (hasSpreadAttribute(child.openingElement.attributes ?? [])) return true;
      if (hasNestedControl(child.children)) return true;
    }
    if (isNodeOfType(child, "JSXFragment") && hasNestedControl(child.children)) return true;
    if (isNodeOfType(child, "JSXExpressionContainer")) {
      const expression = child.expression;
      if (isNodeOfType(expression, "JSXElement") && expression.openingElement) {
        const childTagName = getJsxElementName(expression.openingElement);
        if (CONTROL_ELEMENTS.has(childTagName)) return true;
        if (/^[A-Z]/.test(childTagName)) return true;
      }
    }
  }
  return false;
};

export const a11yLabelHasAssociatedControl = defineRule<Rule>({
  id: "a11y-label-has-associated-control",
  severity: "warn",
  recommendation: MESSAGE,
  create: (context: RuleContext) => ({
    JSXElement(node: EsTreeNodeOfType<"JSXElement">) {
      if (!node.openingElement) return;
      const tagName = getJsxElementName(node.openingElement);
      if (tagName !== "label") return;
      if (hasSpreadAttribute(node.openingElement.attributes ?? [])) return;

      const htmlForAttribute = findJsxAttributeIgnoreCase(
        node.openingElement.attributes,
        "htmlFor",
      );
      if (htmlForAttribute && isJsxAttributeValueTruthy(htmlForAttribute)) return;

      const forAttribute = findJsxAttributeIgnoreCase(node.openingElement.attributes, "for");
      if (forAttribute && isJsxAttributeValueTruthy(forAttribute)) return;

      const ariaLabel = findJsxAttributeIgnoreCase(node.openingElement.attributes, "aria-label");
      if (ariaLabel && isJsxAttributeValueTruthy(ariaLabel)) return;

      const ariaLabelledBy = findJsxAttributeIgnoreCase(
        node.openingElement.attributes,
        "aria-labelledby",
      );
      if (ariaLabelledBy && isJsxAttributeValueTruthy(ariaLabelledBy)) return;

      if (hasNestedControl(node.children)) return;

      context.report({ node, message: MESSAGE });
    },
  }),
});
