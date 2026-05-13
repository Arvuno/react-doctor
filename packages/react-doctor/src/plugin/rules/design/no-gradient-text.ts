import { defineRule, findJsxAttribute } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

const getStringFromClassNameAttr = (node: EsTreeNode): string | null => {
  const classAttr = findJsxAttribute(node.attributes ?? [], "className");
  if (!classAttr?.value) return null;
  if (classAttr.value.type === "Literal" && typeof classAttr.value.value === "string") {
    return classAttr.value.value;
  }
  if (
    classAttr.value.type === "JSXExpressionContainer" &&
    classAttr.value.expression?.type === "Literal" &&
    typeof classAttr.value.expression.value === "string"
  ) {
    return classAttr.value.expression.value;
  }
  if (
    classAttr.value.type === "JSXExpressionContainer" &&
    classAttr.value.expression?.type === "TemplateLiteral" &&
    classAttr.value.expression.quasis?.length === 1
  ) {
    return classAttr.value.expression.quasis[0].value?.raw ?? null;
  }
  return null;
};

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

const getStylePropertyKey = (property: EsTreeNode): string | null => {
  if (property.type !== "Property") return null;
  if (property.key?.type === "Identifier") return property.key.name;
  if (property.key?.type === "Literal" && typeof property.key.value === "string")
    return property.key.value;
  return null;
};

export const noGradientText = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      const expression = getInlineStyleExpression(node);
      if (!expression) return;

      let hasBackgroundClipText = false;
      let hasGradientBackground = false;

      for (const property of expression.properties ?? []) {
        const key = getStylePropertyKey(property);
        const value = getStylePropertyStringValue(property);
        if (!key || !value) continue;

        if ((key === "backgroundClip" || key === "WebkitBackgroundClip") && value === "text") {
          hasBackgroundClipText = true;
        }
        if ((key === "backgroundImage" || key === "background") && value.includes("gradient")) {
          hasGradientBackground = true;
        }
      }

      if (hasBackgroundClipText && hasGradientBackground) {
        context.report({
          node,
          message:
            "Gradient text (background-clip: text) is decorative rather than meaningful — a common AI tell. Use solid colors for text",
        });
      }
    },
    JSXOpeningElement(node: EsTreeNode) {
      const classStr = getStringFromClassNameAttr(node);
      if (!classStr) return;

      if (/\bbg-clip-text\b/.test(classStr) && /\bbg-gradient-to-/.test(classStr)) {
        context.report({
          node,
          message:
            "Gradient text (bg-clip-text + bg-gradient) is decorative rather than meaningful — a common AI tell. Use solid colors for text",
        });
      }
    },
  }),
});
