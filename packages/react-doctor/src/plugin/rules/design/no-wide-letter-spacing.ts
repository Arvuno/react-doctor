import { WIDE_TRACKING_THRESHOLD_EM } from "../../constants.js";
import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

const getInlineStyleExpression = (node: EsTreeNode): EsTreeNode | null => {
  if (node.name?.type !== "JSXIdentifier" || node.name.name !== "style") return null;
  if (node.value?.type !== "JSXExpressionContainer") return null;
  const expression = node.value.expression;
  if (expression?.type !== "ObjectExpression") return null;
  return expression;
};

const getStylePropertyStringValue = (property: EsTreeNode): string | null => {
  if (property.value?.type === "Literal" && typeof property.value.value === "string") {
    return property.value.value;
  }
  return null;
};

const getStylePropertyNumberValue = (property: EsTreeNode): number | null => {
  if (property.value?.type === "Literal" && typeof property.value.value === "number") {
    return property.value.value;
  }
  if (
    property.value?.type === "UnaryExpression" &&
    property.value.operator === "-" &&
    property.value.argument?.type === "Literal" &&
    typeof property.value.argument.value === "number"
  ) {
    return -property.value.argument.value;
  }
  return null;
};

const getStylePropertyKey = (property: EsTreeNode): string | null => {
  if (property.type !== "Property") return null;
  if (property.key?.type === "Identifier") return property.key.name;
  if (property.key?.type === "Literal" && typeof property.key.value === "string")
    return property.key.value;
  return null;
};

export const noWideLetterSpacing = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      const expression = getInlineStyleExpression(node);
      if (!expression) return;

      let isUppercase = false;
      let letterSpacingProperty: EsTreeNode | null = null;
      let letterSpacingEm: number | null = null;

      for (const property of expression.properties ?? []) {
        const key = getStylePropertyKey(property);
        if (!key) continue;

        if (key === "textTransform") {
          const value = getStylePropertyStringValue(property);
          if (value === "uppercase") isUppercase = true;
        }

        if (key === "letterSpacing") {
          letterSpacingProperty = property;
          const strValue = getStylePropertyStringValue(property);
          const numValue = getStylePropertyNumberValue(property);
          if (strValue) {
            const emMatch = strValue.match(/^([\d.]+)em$/);
            if (emMatch) letterSpacingEm = parseFloat(emMatch[1]);
            const pxMatch = strValue.match(/^([\d.]+)px$/);
            if (pxMatch) letterSpacingEm = parseFloat(pxMatch[1]) / 16;
          }
          if (numValue !== null && numValue > 0) {
            letterSpacingEm = numValue / 16;
          }
        }
      }

      if (
        !isUppercase &&
        letterSpacingProperty &&
        letterSpacingEm !== null &&
        letterSpacingEm > WIDE_TRACKING_THRESHOLD_EM
      ) {
        context.report({
          node: letterSpacingProperty,
          message: `Letter spacing ${letterSpacingEm.toFixed(2)}em on body text disrupts natural character groupings. Reserve wide tracking for short uppercase labels only`,
        });
      }
    },
  }),
});
