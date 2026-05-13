import { EFFECT_HOOK_NAMES } from "../../constants.js";
import { defineRule, getEffectCallback, isHookCall, walkAst } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const queryNoQueryInEffect = defineRule<Rule>({
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isHookCall(node, EFFECT_HOOK_NAMES)) return;

      const callback = getEffectCallback(node);
      if (!callback) return;

      walkAst(callback, (child: EsTreeNode) => {
        if (child.type !== "CallExpression") return;

        const calleeName = child.callee?.type === "Identifier" ? child.callee.name : null;

        if (calleeName === "refetch") {
          context.report({
            node: child,
            message:
              "refetch() inside useEffect — React Query manages refetching automatically. Use queryKey dependencies or the enabled option instead",
          });
        }
      });
    },
  }),
});
