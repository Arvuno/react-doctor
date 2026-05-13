import { INLINE_STYLE_PROPERTY_THRESHOLD } from "../../constants.js";
import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

const getInlineStyleExpression = (node: EsTreeNode): EsTreeNode | null => {
  if (node.name?.type !== "JSXIdentifier" || node.name.name !== "style") return null;
  if (node.value?.type !== "JSXExpressionContainer") return null;
  const expression = node.value.expression;
  if (expression?.type !== "ObjectExpression") return null;
  return expression;
};

export const noInlineExhaustiveStyle = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      const expression = getInlineStyleExpression(node);
      if (!expression) return;

      const propertyCount =
        expression.properties?.filter((property: EsTreeNode) => property.type === "Property")
          .length ?? 0;

      if (propertyCount >= INLINE_STYLE_PROPERTY_THRESHOLD) {
        context.report({
          node: expression,
          message: `${propertyCount} inline style properties — extract to a CSS class, CSS module, or styled component for maintainability and reuse`,
        });
      }
    },
  }),
});
