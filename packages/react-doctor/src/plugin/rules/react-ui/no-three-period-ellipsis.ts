import {
  ELLIPSIS_EXCLUDED_TAG_NAMES,
  TRAILING_THREE_PERIOD_ELLIPSIS_PATTERN,
} from "../../constants.js";
import { defineRule, findJsxAttribute } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

const getOpeningElementTagName = (openingElement: EsTreeNode | null | undefined): string | null => {
  if (!openingElement) return null;
  if (openingElement.name?.type === "JSXIdentifier") return openingElement.name.name;
  if (openingElement.name?.type === "JSXMemberExpression") {
    let cursor = openingElement.name;
    while (cursor.type === "JSXMemberExpression") {
      cursor = cursor.property;
    }
    if (cursor?.type === "JSXIdentifier") return cursor.name;
  }
  return null;
};

const isInsideExcludedAncestor = (jsxTextNode: EsTreeNode): boolean => {
  let cursor = jsxTextNode.parent;
  while (cursor) {
    if (cursor.type === "JSXElement") {
      const tagName = getOpeningElementTagName(cursor.openingElement);
      if (tagName && ELLIPSIS_EXCLUDED_TAG_NAMES.has(tagName.toLowerCase())) return true;
      const translateAttribute = findJsxAttribute(
        cursor.openingElement?.attributes ?? [],
        "translate",
      );
      if (
        translateAttribute?.value?.type === "Literal" &&
        translateAttribute.value.value === "no"
      ) {
        return true;
      }
    }
    cursor = cursor.parent;
  }
  return false;
};

export const noThreePeriodEllipsis = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXText(jsxTextNode: EsTreeNode) {
      const textValue = typeof jsxTextNode.value === "string" ? jsxTextNode.value : "";
      if (!TRAILING_THREE_PERIOD_ELLIPSIS_PATTERN.test(textValue)) return;
      if (isInsideExcludedAncestor(jsxTextNode)) return;
      context.report({
        node: jsxTextNode,
        message:
          'Three-period ellipsis ("...") in JSX text — use the actual ellipsis character "…" (or `&hellip;`)',
      });
    },
  }),
});
