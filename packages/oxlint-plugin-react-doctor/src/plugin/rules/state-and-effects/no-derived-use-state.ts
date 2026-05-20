import { createComponentPropStackTracker } from "../../utils/create-component-prop-stack-tracker.js";
import { defineRule } from "../../utils/define-rule.js";
import { getRootIdentifierName } from "../../utils/get-root-identifier-name.js";
import { isHookCall } from "../../utils/is-hook-call.js";
import type { Rule } from "../../utils/rule.js";
import type { RuleContext } from "../../utils/rule-context.js";
import { isNodeOfType } from "../../utils/is-node-of-type.js";
import type { EsTreeNodeOfType } from "../../utils/es-tree-node-of-type.js";

// Props whose NAME explicitly signals "seed only / initial only" —
// the consumer has already opted into the uncontrolled-init pattern
// by choosing this name, so we shouldn't flag them. Captures the
// canonical React names (`initialValue`, `defaultValue`, `seedValue`,
// `defaultX`, `initialX`, `seedX`, etc.).
const isInitialOnlyPropName = (propName: string): boolean => {
  if (propName === "initialValue" || propName === "defaultValue" || propName === "seedValue") {
    return true;
  }
  return (
    /^initial[A-Z]/.test(propName) ||
    /^default[A-Z]/.test(propName) ||
    /^seed[A-Z]/.test(propName) ||
    /^starting[A-Z]/.test(propName) ||
    /^baseline[A-Z]/.test(propName) ||
    /^preset[A-Z]/.test(propName)
  );
};

export const noDerivedUseState = defineRule<Rule>({
  id: "no-derived-useState",
  tags: ["test-noise"],
  severity: "warn",
  recommendation:
    "Remove useState and compute the value inline: `const value = transform(propName)`",
  create: (context: RuleContext) => {
    const propStackTracker = createComponentPropStackTracker();

    return {
      ...propStackTracker.visitors,
      CallExpression(node: EsTreeNodeOfType<"CallExpression">) {
        if (!isHookCall(node, "useState") || !node.arguments?.length) return;
        const initializer = node.arguments[0];

        if (
          isNodeOfType(initializer, "Identifier") &&
          propStackTracker.isPropName(initializer.name)
        ) {
          if (isInitialOnlyPropName(initializer.name)) return;
          context.report({
            node,
            message: `useState initialized from prop "${initializer.name}" — if this value should stay in sync with the prop, derive it during render instead`,
          });
          return;
        }

        if (isNodeOfType(initializer, "MemberExpression") && !initializer.computed) {
          const rootIdentifierName = getRootIdentifierName(initializer);
          if (rootIdentifierName && propStackTracker.isPropName(rootIdentifierName)) {
            // Last property name in `props.initialValue` style chains
            // — if that's an initial-only name, skip too.
            if (
              isNodeOfType(initializer.property, "Identifier") &&
              isInitialOnlyPropName(initializer.property.name)
            ) {
              return;
            }
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
