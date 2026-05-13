import { GOOGLE_FONTS_PATTERN } from "../../constants.js";
import { defineRule, findJsxAttribute } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const nextjsNoFontLink = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      if (node.name?.type !== "JSXIdentifier" || node.name.name !== "link") return;
      const attributes = node.attributes ?? [];

      const hrefAttribute = findJsxAttribute(attributes, "href");
      if (!hrefAttribute?.value) return;

      const hrefValue = hrefAttribute.value.type === "Literal" ? hrefAttribute.value.value : null;

      if (typeof hrefValue === "string" && GOOGLE_FONTS_PATTERN.test(hrefValue)) {
        context.report({
          node,
          message:
            "Loading Google Fonts via <link> — use next/font instead for self-hosting, zero layout shift, and no render-blocking requests",
        });
      }
    },
  }),
});
