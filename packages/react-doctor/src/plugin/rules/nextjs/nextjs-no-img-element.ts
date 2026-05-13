import { OG_ROUTE_PATTERN } from "../../constants.js";
import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const nextjsNoImgElement = defineRule<Rule>({
  create: (context: RuleContext) => {
    const filename = context.getFilename?.() ?? "";
    const isOgRoute = OG_ROUTE_PATTERN.test(filename);

    return {
      JSXOpeningElement(node: EsTreeNode) {
        if (isOgRoute) return;
        if (node.name?.type === "JSXIdentifier" && node.name.name === "img") {
          context.report({
            node,
            message:
              "Use next/image instead of <img> — provides automatic optimization, lazy loading, and responsive srcset",
          });
        }
      },
    };
  },
});
