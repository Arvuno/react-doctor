import { defineRule } from "../../utils/define-rule.js";
import type { Rule } from "../../utils/rule.js";
import type { RuleContext } from "../../utils/rule-context.js";
import type { EsTreeNodeOfType } from "../../utils/es-tree-node-of-type.js";
import { getJsxElementName } from "../../utils/get-jsx-element-name.js";
import { findJsxAttributeIgnoreCase } from "../../utils/find-jsx-attribute-ignore-case.js";
import { HTML_TAGS } from "../../utils/jsx-a11y-helpers.js";

const MESSAGE = "The `scope` prop can only be used on `<th>` elements. Remove the `scope` prop on elements other than `<th>`.";

export const a11yScope = defineRule<Rule>({
  id: "a11y-scope",
  severity: "warn",
  recommendation: MESSAGE,
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNodeOfType<"JSXOpeningElement">) {
      const scopeAttribute = findJsxAttributeIgnoreCase(node.attributes, "scope");
      if (!scopeAttribute) return;
      const tagName = getJsxElementName(node);
      if (tagName === "th") return;
      if (!HTML_TAGS.has(tagName)) return;
      context.report({ node: scopeAttribute, message: MESSAGE });
    },
  }),
});
