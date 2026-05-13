import { ANIMATION_CALLBACK_NAMES } from "../../constants.js";
import { defineRule, isMemberProperty, walkAst } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const noGlobalCssVariableAnimation = defineRule<Rule>({
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (node.callee?.type !== "Identifier") return;
      if (!ANIMATION_CALLBACK_NAMES.has(node.callee.name)) return;

      const callback = node.arguments?.[0];
      if (!callback) return;

      const calleeName = node.callee.name;
      walkAst(callback, (child: EsTreeNode) => {
        if (child.type !== "CallExpression") return;
        if (!isMemberProperty(child.callee, "setProperty")) return;
        if (child.arguments?.[0]?.type !== "Literal") return;

        const variableName = child.arguments[0].value;
        if (typeof variableName !== "string" || !variableName.startsWith("--")) return;

        context.report({
          node: child,
          message: `CSS variable "${variableName}" updated in ${calleeName} — forces style recalculation on all inheriting elements every frame`,
        });
      });
    },
  }),
});
