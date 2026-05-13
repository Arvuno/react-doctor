import {
  createComponentPropStackTracker,
  defineRule,
  getRootIdentifierName,
  isHookCall,
} from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const noDerivedUseState = defineRule<Rule>({
  create: (context: RuleContext) => {
    const propStackTracker = createComponentPropStackTracker();

    return {
      ...propStackTracker.visitors,
      CallExpression(node: EsTreeNode) {
        if (!isHookCall(node, "useState") || !node.arguments?.length) return;
        const initializer = node.arguments[0];

        if (initializer.type === "Identifier" && propStackTracker.isPropName(initializer.name)) {
          context.report({
            node,
            message: `useState initialized from prop "${initializer.name}" — if this value should stay in sync with the prop, derive it during render instead`,
          });
          return;
        }

        if (initializer.type === "MemberExpression" && !initializer.computed) {
          const rootIdentifierName = getRootIdentifierName(initializer);
          if (rootIdentifierName && propStackTracker.isPropName(rootIdentifierName)) {
            context.report({
              node,
              message: `useState initialized from prop "${rootIdentifierName}" — if this value should stay in sync with the prop, derive it during render instead`,
            });
          }
        }
      },
    };
  },
});
