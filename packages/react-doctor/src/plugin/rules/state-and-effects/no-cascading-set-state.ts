import { CASCADING_SET_STATE_THRESHOLD, EFFECT_HOOK_NAMES } from "../../constants.js";
import {
  countSetStateCalls,
  defineRule,
  getEffectCallback,
  isHookCall,
} from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const noCascadingSetState = defineRule<Rule>({
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isHookCall(node, EFFECT_HOOK_NAMES)) return;
      const callback = getEffectCallback(node);
      if (!callback) return;

      const setStateCallCount = countSetStateCalls(callback);
      if (setStateCallCount >= CASCADING_SET_STATE_THRESHOLD) {
        context.report({
          node,
          message: `${setStateCallCount} setState calls in a single useEffect — consider using useReducer or deriving state`,
        });
      }
    },
  }),
});
