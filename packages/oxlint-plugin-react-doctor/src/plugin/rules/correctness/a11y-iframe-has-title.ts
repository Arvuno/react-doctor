import { defineRule } from "../../utils/define-rule.js";
import type { Rule } from "../../utils/rule.js";
import type { RuleContext } from "../../utils/rule-context.js";
import type { EsTreeNodeOfType } from "../../utils/es-tree-node-of-type.js";
import { getJsxElementName } from "../../utils/get-jsx-element-name.js";
import { findJsxAttributeIgnoreCase } from "../../utils/find-jsx-attribute-ignore-case.js";
import { isJsxAttributeValueTruthy } from "../../utils/jsx-a11y-helpers.js";

const MESSAGE =
  "Missing `title` attribute for the `iframe` element. Provide `title` property for `iframe` element.";

export const a11yIframeHasTitle = defineRule<Rule>({
  id: "a11y-iframe-has-title",
  severity: "warn",
  recommendation: MESSAGE,
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNodeOfType<"JSXOpeningElement">) {
      const tagName = getJsxElementName(node);
      if (tagName !== "iframe") return;
      const titleAttribute = findJsxAttributeIgnoreCase(node.attributes, "title");
      if (!titleAttribute || !isJsxAttributeValueTruthy(titleAttribute)) {
        context.report({ node, message: MESSAGE });
      }
    },
  }),
});
