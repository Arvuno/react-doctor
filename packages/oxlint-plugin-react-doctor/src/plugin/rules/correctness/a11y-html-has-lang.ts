import { defineRule } from "../../utils/define-rule.js";
import type { Rule } from "../../utils/rule.js";
import type { RuleContext } from "../../utils/rule-context.js";
import type { EsTreeNodeOfType } from "../../utils/es-tree-node-of-type.js";
import { getJsxElementName } from "../../utils/get-jsx-element-name.js";
import { findJsxAttributeIgnoreCase } from "../../utils/find-jsx-attribute-ignore-case.js";
import { isNodeOfType } from "../../utils/is-node-of-type.js";

const MISSING_LANG =
  "Missing lang attribute. Add a `lang` attribute to the `html` element whose value represents the primary language of the document.";
const MISSING_LANG_VALUE =
  "Missing value for `lang` attribute. Must have meaningful value for `lang` prop.";

const isValidLangValue = (attribute: EsTreeNodeOfType<"JSXAttribute">): boolean => {
  const value = attribute.value;
  if (!value) return true;
  if (isNodeOfType(value, "Literal") && typeof value.value === "string") return value.value !== "";
  if (isNodeOfType(value, "JSXExpressionContainer")) {
    const expression = value.expression;
    if (isNodeOfType(expression, "Identifier") && expression.name === "undefined") return false;
    if (isNodeOfType(expression, "Literal")) {
      if (
        expression.value === null ||
        expression.value === false ||
        typeof expression.value === "number"
      )
        return false;
      if (typeof expression.value === "string") return expression.value !== "";
    }
    if (isNodeOfType(expression, "JSXEmptyExpression")) return false;
    if (isNodeOfType(expression, "TemplateLiteral")) {
      if (expression.expressions?.length > 0) return true;
      return (
        expression.quasis?.some(
          (quasi: EsTreeNodeOfType<"TemplateElement">) =>
            quasi.value?.raw && quasi.value.raw !== "",
        ) ?? false
      );
    }
    return true;
  }
  return true;
};

export const a11yHtmlHasLang = defineRule<Rule>({
  id: "a11y-html-has-lang",
  severity: "warn",
  recommendation: MISSING_LANG,
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNodeOfType<"JSXOpeningElement">) {
      const tagName = getJsxElementName(node);
      if (tagName !== "html") return;
      const langAttribute = findJsxAttributeIgnoreCase(node.attributes, "lang");
      if (!langAttribute) {
        context.report({ node, message: MISSING_LANG });
        return;
      }
      if (!isValidLangValue(langAttribute)) {
        context.report({ node, message: MISSING_LANG_VALUE });
      }
    },
  }),
});
