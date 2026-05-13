import { defineRule, findJsxAttribute, hasJsxAttribute } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const noUndeferredThirdParty = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      if (node.name?.type !== "JSXIdentifier" || node.name.name !== "script") return;
      const attributes = node.attributes ?? [];
      if (!findJsxAttribute(attributes, "src")) return;

      if (!hasJsxAttribute(attributes, "defer") && !hasJsxAttribute(attributes, "async")) {
        context.report({
          node,
          message:
            "Synchronous <script> with src — add defer or async to avoid blocking first paint",
        });
      }
    },
  }),
});
