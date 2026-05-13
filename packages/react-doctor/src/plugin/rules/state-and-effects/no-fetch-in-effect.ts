import { EFFECT_HOOK_NAMES } from "../../constants.js";
import { containsFetchCall, defineRule, getEffectCallback, isHookCall } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const noFetchInEffect = defineRule<Rule>({
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isHookCall(node, EFFECT_HOOK_NAMES)) return;
      const callback = getEffectCallback(node);
      if (!callback) return;

      if (containsFetchCall(callback)) {
        context.report({
          node,
          message:
            "fetch() inside useEffect — use a data fetching library (react-query, SWR) or server component",
        });
      }
    },
  }),
});
