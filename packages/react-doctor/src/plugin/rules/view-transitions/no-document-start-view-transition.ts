import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

// HACK: in React's <ViewTransition> world, calling
// `document.startViewTransition()` directly bypasses React's lifecycle
// hooks and can fight the auto-generated `viewTransitionName`s React
// emits. The supported way is to render <ViewTransition> and let React
// call startViewTransition for you (around startTransition, useDeferredValue,
// or Suspense reveals).
export const noDocumentStartViewTransition = defineRule<Rule>({
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      const callee = node.callee;
      if (callee?.type !== "MemberExpression") return;
      if (callee.object?.type !== "Identifier" || callee.object.name !== "document") return;
      if (callee.property?.type !== "Identifier" || callee.property.name !== "startViewTransition")
        return;
      context.report({
        node,
        message:
          "document.startViewTransition() bypasses React's <ViewTransition> integration — render a <ViewTransition> component and let React drive the transition (around startTransition / useDeferredValue / Suspense)",
      });
    },
  }),
});
