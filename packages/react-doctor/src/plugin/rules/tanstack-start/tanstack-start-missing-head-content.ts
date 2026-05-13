import { TANSTACK_ROOT_ROUTE_FILE_PATTERN } from "../../constants.js";
import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const tanstackStartMissingHeadContent = defineRule<Rule>({
  create: (context: RuleContext) => {
    let hasHeadContentElement = false;

    return {
      JSXOpeningElement(node: EsTreeNode) {
        const filename = context.getFilename?.() ?? "";
        const isRootRouteFile = TANSTACK_ROOT_ROUTE_FILE_PATTERN.test(filename);
        if (!isRootRouteFile) return;

        if (node.name?.type === "JSXIdentifier" && node.name.name === "HeadContent") {
          hasHeadContentElement = true;
        }
      },
      "Program:exit"(programNode: EsTreeNode) {
        const filename = context.getFilename?.() ?? "";
        const isRootRouteFile = TANSTACK_ROOT_ROUTE_FILE_PATTERN.test(filename);
        if (!isRootRouteFile) return;

        if (!hasHeadContentElement) {
          context.report({
            node: programNode,
            message:
              "Root route (__root) without <HeadContent /> — route head() meta tags won't render",
          });
        }
      },
    };
  },
});
