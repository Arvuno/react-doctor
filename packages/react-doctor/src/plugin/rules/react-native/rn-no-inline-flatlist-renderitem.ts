import { REACT_NATIVE_LIST_COMPONENTS } from "../../constants.js";
import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

const resolveJsxElementName = (openingElement: EsTreeNode): string | null => {
  const elementName = openingElement?.name;
  if (!elementName) return null;
  if (elementName.type === "JSXIdentifier") return elementName.name;
  if (elementName.type === "JSXMemberExpression") return elementName.property?.name ?? null;
  return null;
};

export const rnNoInlineFlatlistRenderitem = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      if (node.name?.type !== "JSXIdentifier" || node.name.name !== "renderItem") return;
      if (!node.value || node.value.type !== "JSXExpressionContainer") return;

      const openingElement = node.parent;
      if (!openingElement || openingElement.type !== "JSXOpeningElement") return;

      const listComponentName = resolveJsxElementName(openingElement);
      if (!listComponentName || !REACT_NATIVE_LIST_COMPONENTS.has(listComponentName)) return;

      const expression = node.value.expression;
      if (
        expression?.type !== "ArrowFunctionExpression" &&
        expression?.type !== "FunctionExpression"
      )
        return;

      context.report({
        node: expression,
        message: `Inline renderItem on <${listComponentName}> creates a new function reference every render — extract to a named function or wrap in useCallback`,
      });
    },
  }),
});
