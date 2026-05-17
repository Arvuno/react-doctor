import { defineRule } from "../../utils/define-rule.js";
import type { Rule } from "../../utils/rule.js";
import type { RuleContext } from "../../utils/rule-context.js";
import type { EsTreeNodeOfType } from "../../utils/es-tree-node-of-type.js";
import { getJsxElementName } from "../../utils/get-jsx-element-name.js";
import { findJsxAttributeIgnoreCase } from "../../utils/find-jsx-attribute-ignore-case.js";
import {
  HTML_TAGS,
  isHiddenFromScreenReader,
  isPresentationRole,
  hasSpreadAttribute,
} from "../../utils/jsx-a11y-helpers.js";

const MESSAGE = "Visible, non-interactive elements with click handlers must have at least one keyboard listener (`onKeyDown`, `onKeyUp`, or `onKeyPress`).";

export const a11yClickEventsHaveKeyEvents = defineRule<Rule>({
  id: "a11y-click-events-have-key-events",
  severity: "warn",
  recommendation: MESSAGE,
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNodeOfType<"JSXOpeningElement">) {
      const tagName = getJsxElementName(node);
      if (!HTML_TAGS.has(tagName)) return;
      if (hasSpreadAttribute(node.attributes)) return;
      const onClickAttribute = findJsxAttributeIgnoreCase(node.attributes, "onClick");
      if (!onClickAttribute) return;
      if (isHiddenFromScreenReader(node.attributes)) return;
      if (isPresentationRole(node.attributes)) return;
      const hasOnKeyDown = Boolean(findJsxAttributeIgnoreCase(node.attributes, "onKeyDown"));
      const hasOnKeyUp = Boolean(findJsxAttributeIgnoreCase(node.attributes, "onKeyUp"));
      const hasOnKeyPress = Boolean(findJsxAttributeIgnoreCase(node.attributes, "onKeyPress"));
      if (hasOnKeyDown || hasOnKeyUp || hasOnKeyPress) return;
      context.report({ node, message: MESSAGE });
    },
  }),
});
