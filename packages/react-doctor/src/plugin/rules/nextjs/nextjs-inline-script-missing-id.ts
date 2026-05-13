import { defineRule, hasJsxAttribute } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const nextjsInlineScriptMissingId = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      if (node.name?.type !== "JSXIdentifier" || node.name.name !== "Script") return;
      const attributes = node.attributes ?? [];

      if (hasJsxAttribute(attributes, "src")) return;
      if (hasJsxAttribute(attributes, "id")) return;

      context.report({
        node,
        message:
          "Inline <Script> without id — Next.js requires an id attribute to track inline scripts",
      });
    },
  }),
});
