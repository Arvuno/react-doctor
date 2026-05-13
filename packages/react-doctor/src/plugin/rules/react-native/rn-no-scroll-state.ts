import { defineRule, walkAst } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

// HACK: setting React state inside an onScroll handler triggers a re-render
// at scroll-event frequency (60-120Hz). Use a Reanimated shared value
// (useSharedValue + useAnimatedScrollHandler) or a ref + raf throttle so
// the JS thread isn't pegged.
export const rnNoScrollState = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      if (node.name?.type !== "JSXIdentifier") return;
      if (node.name.name !== "onScroll") return;
      if (node.value?.type !== "JSXExpressionContainer") return;
      const expression = node.value.expression;
      if (
        expression?.type !== "ArrowFunctionExpression" &&
        expression?.type !== "FunctionExpression"
      ) {
        return;
      }

      let setStateCallNode: EsTreeNode | null = null;
      walkAst(expression.body, (child: EsTreeNode) => {
        if (setStateCallNode) return;
        if (
          child.type === "CallExpression" &&
          child.callee?.type === "Identifier" &&
          /^set[A-Z]/.test(child.callee.name)
        ) {
          setStateCallNode = child;
        }
      });

      if (setStateCallNode) {
        context.report({
          node: setStateCallNode,
          message:
            "setState in onScroll triggers re-renders on every scroll event — use a Reanimated shared value (useAnimatedScrollHandler) or a ref to track scroll position",
        });
      }
    },
  }),
});
