import { BARREL_INDEX_SUFFIXES } from "../../constants.js";
import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const noBarrelImport = defineRule<Rule>({
  create: (context: RuleContext) => {
    let didReportForFile = false;

    return {
      ImportDeclaration(node: EsTreeNode) {
        if (didReportForFile) return;

        const source = node.source?.value;
        if (typeof source !== "string" || !source.startsWith(".")) return;

        if (BARREL_INDEX_SUFFIXES.some((suffix) => source.endsWith(suffix))) {
          didReportForFile = true;
          context.report({
            node,
            message:
              "Import from barrel/index file — import directly from the source module for better tree-shaking",
          });
        }
      },
    };
  },
});
