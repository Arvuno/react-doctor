import { HEAVY_LIBRARIES } from "../../constants.js";
import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const preferDynamicImport = defineRule<Rule>({
  create: (context: RuleContext) => ({
    ImportDeclaration(node: EsTreeNode) {
      const source = node.source?.value;
      if (typeof source === "string" && HEAVY_LIBRARIES.has(source)) {
        context.report({
          node,
          message: `"${source}" is a heavy library — use React.lazy() or next/dynamic for code splitting`,
        });
      }
    },
  }),
});
