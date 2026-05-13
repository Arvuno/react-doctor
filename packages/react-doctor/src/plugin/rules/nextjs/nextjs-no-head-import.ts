import { APP_DIRECTORY_PATTERN } from "../../constants.js";
import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const nextjsNoHeadImport = defineRule<Rule>({
  create: (context: RuleContext) => ({
    ImportDeclaration(node: EsTreeNode) {
      if (node.source?.value !== "next/head") return;

      const filename = context.getFilename?.() ?? "";
      if (!APP_DIRECTORY_PATTERN.test(filename)) return;

      context.report({
        node,
        message: "next/head is not supported in the App Router — use the Metadata API instead",
      });
    },
  }),
});
