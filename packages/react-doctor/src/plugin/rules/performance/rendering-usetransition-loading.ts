import { LOADING_STATE_PATTERN } from "../../constants.js";
import { defineRule, isHookCall } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const renderingUsetransitionLoading = defineRule<Rule>({
  create: (context: RuleContext) => ({
    VariableDeclarator(node: EsTreeNode) {
      if (node.id?.type !== "ArrayPattern" || !node.id.elements?.length) return;
      if (!node.init || !isHookCall(node.init, "useState")) return;
      if (!node.init.arguments?.length) return;

      const initializer = node.init.arguments[0];
      if (initializer.type !== "Literal" || initializer.value !== false) return;

      const stateVariableName = node.id.elements[0]?.name;
      if (!stateVariableName || !LOADING_STATE_PATTERN.test(stateVariableName)) return;

      context.report({
        node: node.init,
        message: `useState for "${stateVariableName}" — if this guards a state transition (not an async fetch), consider useTransition instead`,
      });
    },
  }),
});
