import { EXECUTABLE_SCRIPT_TYPES } from "../../constants.js";
import { defineRule, findJsxAttribute } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const nextjsNoNativeScript = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      if (node.name?.type !== "JSXIdentifier" || node.name.name !== "script") return;

      const typeAttribute = findJsxAttribute(node.attributes ?? [], "type");
      const typeValue = typeAttribute?.value?.type === "Literal" ? typeAttribute.value.value : null;
      if (typeof typeValue === "string" && !EXECUTABLE_SCRIPT_TYPES.has(typeValue)) return;

      context.report({
        node,
        message:
          "Use next/script <Script> instead of <script> — provides loading strategy optimization and deferred loading",
      });
    },
  }),
});
