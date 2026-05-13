import { defineRule, hasJsxAttribute } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const nextjsImageMissingSizes = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      if (node.name?.type !== "JSXIdentifier" || node.name.name !== "Image") return;
      const attributes = node.attributes ?? [];
      if (!hasJsxAttribute(attributes, "fill")) return;
      if (hasJsxAttribute(attributes, "sizes")) return;

      context.report({
        node,
        message:
          "next/image with fill but no sizes — the browser downloads the largest image. Add a sizes attribute for responsive behavior",
      });
    },
  }),
});
