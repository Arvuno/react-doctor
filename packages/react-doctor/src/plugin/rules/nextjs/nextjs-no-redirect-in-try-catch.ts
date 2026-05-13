import { NEXTJS_NAVIGATION_FUNCTIONS } from "../../constants.js";
import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const nextjsNoRedirectInTryCatch = defineRule<Rule>({
  create: (context: RuleContext) => {
    let tryCatchDepth = 0;

    return {
      TryStatement() {
        tryCatchDepth++;
      },
      "TryStatement:exit"() {
        tryCatchDepth--;
      },
      CallExpression(node: EsTreeNode) {
        if (tryCatchDepth === 0) return;
        if (node.callee?.type !== "Identifier") return;
        if (!NEXTJS_NAVIGATION_FUNCTIONS.has(node.callee.name)) return;

        context.report({
          node,
          message: `${node.callee.name}() inside try-catch — this throws a special error Next.js handles internally. Move it outside the try block or use unstable_rethrow() in the catch`,
        });
      },
    };
  },
});
