import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const noFullLodashImport = defineRule<Rule>({
  create: (context: RuleContext) => ({
    ImportDeclaration(node: EsTreeNode) {
      const source = node.source?.value;
      if (source === "lodash" || source === "lodash-es") {
        context.report({
          node,
          message: "Importing entire lodash library — import from 'lodash/functionName' instead",
        });
      }
    },
  }),
});
