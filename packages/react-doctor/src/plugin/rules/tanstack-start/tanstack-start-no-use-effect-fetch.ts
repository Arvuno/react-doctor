import { EFFECT_HOOK_NAMES, TANSTACK_ROUTE_FILE_PATTERN } from "../../constants.js";
import { defineRule, isHookCall, walkAst } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const tanstackStartNoUseEffectFetch = defineRule<Rule>({
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      const filename = context.getFilename?.() ?? "";
      const isRouteFile = TANSTACK_ROUTE_FILE_PATTERN.test(filename);
      if (!isRouteFile) return;

      if (!isHookCall(node, EFFECT_HOOK_NAMES)) return;

      const callback = node.arguments?.[0];
      if (!callback) return;

      let hasFetchCall = false;
      walkAst(callback, (child: EsTreeNode) => {
        if (hasFetchCall) return;
        if (
          child.type === "CallExpression" &&
          child.callee?.type === "Identifier" &&
          child.callee.name === "fetch"
        ) {
          hasFetchCall = true;
        }
      });

      if (hasFetchCall) {
        context.report({
          node,
          message:
            "fetch() inside useEffect in a route file — use the route loader or createServerFn() instead",
        });
      }
    },
  }),
});
