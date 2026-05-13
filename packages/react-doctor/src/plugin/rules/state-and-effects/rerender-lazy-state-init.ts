import { TRIVIAL_INITIALIZER_NAMES } from "../../constants.js";
import { defineRule, isHookCall } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const rerenderLazyStateInit = defineRule<Rule>({
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isHookCall(node, "useState") || !node.arguments?.length) return;
      const initializer = node.arguments[0];
      if (initializer.type !== "CallExpression") return;

      const calleeName =
        initializer.callee?.type === "Identifier"
          ? initializer.callee.name
          : (initializer.callee?.property?.name ?? "fn");

      if (TRIVIAL_INITIALIZER_NAMES.has(calleeName)) return;

      context.report({
        node: initializer,
        message: `useState(${calleeName}()) calls initializer on every render — use useState(() => ${calleeName}()) for lazy initialization`,
      });
    },
  }),
});
