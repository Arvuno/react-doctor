import { Z_INDEX_ABSURD_THRESHOLD } from "../../constants.js";
import { defineRule, walkAst } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

const getInlineStyleExpression = (node: EsTreeNode): EsTreeNode | null => {
  if (node.name?.type !== "JSXIdentifier" || node.name.name !== "style") return null;
  if (node.value?.type !== "JSXExpressionContainer") return null;
  const expression = node.value.expression;
  if (expression?.type !== "ObjectExpression") return null;
  return expression;
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

export const noZIndex9999 = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      const expression = getInlineStyleExpression(node);
      if (!expression) return;

      for (const property of expression.properties ?? []) {
        const key = getStylePropertyKey(property);
        if (key !== "zIndex") continue;

        const zValue = getStylePropertyNumberValue(property);
        if (zValue !== null && Math.abs(zValue) >= Z_INDEX_ABSURD_THRESHOLD) {
          context.report({
            node: property,
            message: `z-index: ${zValue} is arbitrarily high — use a deliberate z-index scale (1–50). Extreme values signal a stacking context problem, not a fix`,
          });
        }
      }
    },
    CallExpression(node: EsTreeNode) {
      if (node.callee?.type !== "MemberExpression") return;
      if (node.callee.property?.type !== "Identifier" || node.callee.property.name !== "create")
        return;
      if (node.callee.object?.type !== "Identifier" || node.callee.object.name !== "StyleSheet")
        return;

      const argument = node.arguments?.[0];
      if (!argument || argument.type !== "ObjectExpression") return;

      walkAst(argument, (child: EsTreeNode) => {
        if (child.type !== "Property") return;
        const key = getStylePropertyKey(child);
        if (key !== "zIndex") return;

        if (child.value?.type === "Literal" && typeof child.value.value === "number") {
          const zValue = child.value.value;
          if (Math.abs(zValue) >= Z_INDEX_ABSURD_THRESHOLD) {
            context.report({
              node: child,
              message: `z-index: ${zValue} is arbitrarily high — use a deliberate z-index scale (1–50). Extreme values signal a stacking context problem, not a fix`,
            });
          }
        }
      });
    },
  }),
});
