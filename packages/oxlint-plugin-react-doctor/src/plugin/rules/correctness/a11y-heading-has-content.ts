import { defineRule } from "../../utils/define-rule.js";
import type { Rule } from "../../utils/rule.js";
import type { RuleContext } from "../../utils/rule-context.js";
import type { EsTreeNodeOfType } from "../../utils/es-tree-node-of-type.js";
import { getJsxElementName } from "../../utils/get-jsx-element-name.js";
import { hasAccessibleChild, isHiddenFromScreenReader } from "../../utils/jsx-a11y-helpers.js";

const HEADINGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
const MESSAGE = "Headings must have content and the content must be accessible by a screen reader.";

export const a11yHeadingHasContent = defineRule<Rule>({
  id: "a11y-heading-has-content",
  severity: "warn",
  recommendation: MESSAGE,
  create: (context: RuleContext) => ({
    JSXElement(node: EsTreeNodeOfType<"JSXElement">) {
      if (!node.openingElement) return;
      const tagName = getJsxElementName(node.openingElement);
      if (!HEADINGS.has(tagName)) return;
      if (isHiddenFromScreenReader(node.openingElement.attributes ?? [])) return;
      if (hasAccessibleChild(node.children ?? [])) return;
      context.report({ node, message: MESSAGE });
    },
  }),
});
