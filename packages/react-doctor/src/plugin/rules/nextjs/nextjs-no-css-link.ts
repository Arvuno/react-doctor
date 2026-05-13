import { GOOGLE_FONTS_PATTERN } from "../../constants.js";
import { defineRule, findJsxAttribute } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const nextjsNoCssLink = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      if (node.name?.type !== "JSXIdentifier" || node.name.name !== "link") return;
      const attributes = node.attributes ?? [];

      const relAttribute = findJsxAttribute(attributes, "rel");
      if (!relAttribute?.value) return;
      const relValue = relAttribute.value.type === "Literal" ? relAttribute.value.value : null;
      if (relValue !== "stylesheet") return;

      const hrefAttribute = findJsxAttribute(attributes, "href");
      if (!hrefAttribute?.value) return;
      const hrefValue = hrefAttribute.value.type === "Literal" ? hrefAttribute.value.value : null;
      if (typeof hrefValue === "string" && GOOGLE_FONTS_PATTERN.test(hrefValue)) return;

      context.report({
        node,
        message: '<link rel="stylesheet"> tag — import CSS directly for bundling and optimization',
      });
    },
  }),
});
