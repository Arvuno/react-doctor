import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const noMoment = defineRule<Rule>({
  create: (context: RuleContext) => ({
    ImportDeclaration(node: EsTreeNode) {
      if (node.source?.value === "moment") {
        context.report({
          node,
          message: 'moment.js is 300kb+ — use "date-fns" or "dayjs" instead',
        });
      }
    },
  }),
});
