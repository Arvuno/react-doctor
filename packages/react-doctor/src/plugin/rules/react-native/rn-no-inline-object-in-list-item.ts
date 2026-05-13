import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

const RENDER_ITEM_PROP_NAMES = new Set([
  "renderItem",
  "renderSectionHeader",
  "renderSectionFooter",
]);

// HACK: inside `renderItem`, JSX prop values that are object literals
// (`style={{...}}`, `user={{...}}`, etc.) allocate a fresh object
// reference per row. Any `memo()`-wrapped row component bails its
// shallow-compare for that prop and rerenders even when the underlying
// data didn't change. Hoist the object outside renderItem (StyleSheet,
// constant, useMemo at list scope) or pass primitives into the row.
export const rnNoInlineObjectInListItem = defineRule<Rule>({
  create: (context: RuleContext) => {
    let renderItemDepth = 0;

    const isRenderItemAttribute = (parent: EsTreeNode | null | undefined): boolean => {
      if (parent?.type !== "JSXAttribute") return false;
      const attrName = parent.name?.type === "JSXIdentifier" ? parent.name.name : null;
      return attrName ? RENDER_ITEM_PROP_NAMES.has(attrName) : false;
    };

    const isRenderItemFunction = (node: EsTreeNode): boolean => {
      if (node.type !== "ArrowFunctionExpression" && node.type !== "FunctionExpression") {
        return false;
      }
      // Walk up: parent should be JSXExpressionContainer whose parent is JSXAttribute renderItem.
      const expressionContainer = node.parent;
      if (expressionContainer?.type !== "JSXExpressionContainer") return false;
      return isRenderItemAttribute(expressionContainer.parent);
    };

    const enter = (node: EsTreeNode): void => {
      if (isRenderItemFunction(node)) renderItemDepth++;
    };
    const exit = (node: EsTreeNode): void => {
      if (isRenderItemFunction(node)) renderItemDepth = Math.max(0, renderItemDepth - 1);
    };

    return {
      ArrowFunctionExpression: enter,
      "ArrowFunctionExpression:exit": exit,
      FunctionExpression: enter,
      "FunctionExpression:exit": exit,
      JSXAttribute(node: EsTreeNode) {
        if (renderItemDepth === 0) return;
        if (node.value?.type !== "JSXExpressionContainer") return;
        if (node.value.expression?.type !== "ObjectExpression") return;
        const propName = node.name?.type === "JSXIdentifier" ? node.name.name : "<unknown>";
        context.report({
          node,
          message: `Inline object literal on "${propName}" inside renderItem — allocates a fresh reference per row and breaks memo() on the row component. Hoist outside renderItem or pass primitives`,
        });
      },
    };
  },
});
