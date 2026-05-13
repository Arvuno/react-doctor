import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

const resolveJsxElementName = (openingElement: EsTreeNode): string | null => {
  const elementName = openingElement?.name;
  if (!elementName) return null;
  if (elementName.type === "JSXIdentifier") return elementName.name;
  if (elementName.type === "JSXMemberExpression") return elementName.property?.name ?? null;
  return null;
};

// HACK: short-name only. `resolveJsxElementName` (defined at top of
// file) returns the property name for JSXMemberExpression — e.g.
// `Animated.ScrollView` resolves to `"ScrollView"`, which is what all
// the existing `REACT_NATIVE_*` sets use. Allowlists below use the same
// short-name form.
const SCROLLVIEW_NAMES = new Set(["ScrollView"]);

// HACK: dynamic `paddingBottom`/`paddingTop` on `contentContainerStyle`
// (e.g. `paddingBottom: keyboardHeight`) reflows the entire scroll
// content every time the value changes — the rows visually shift, and
// any sticky headers re-pin. The native equivalent is `contentInset`,
// which the platform applies as an OS-level offset without re-laying out
// the content.
export const rnScrollviewDynamicPadding = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      const elementName = resolveJsxElementName(node);
      if (!elementName) return;
      if (
        !SCROLLVIEW_NAMES.has(elementName) &&
        elementName !== "FlatList" &&
        elementName !== "FlashList"
      )
        return;

      for (const attr of node.attributes ?? []) {
        if (attr.type !== "JSXAttribute") continue;
        if (attr.name?.type !== "JSXIdentifier" || attr.name.name !== "contentContainerStyle")
          continue;
        if (attr.value?.type !== "JSXExpressionContainer") continue;
        const expression = attr.value.expression;
        if (expression?.type !== "ObjectExpression") continue;

        for (const property of expression.properties ?? []) {
          if (property.type !== "Property") continue;
          if (property.key?.type !== "Identifier") continue;
          const key = property.key.name;
          if (key !== "paddingBottom" && key !== "paddingTop") continue;
          // Static numeric value is fine — only flag dynamic identifiers /
          // member expressions that change between renders.
          const value = property.value;
          if (!value) continue;
          if (value.type === "Literal") continue;

          context.report({
            node: property,
            message: `Dynamic ${key} on contentContainerStyle reflows the scroll content — use \`contentInset\` (OS-level offset, no relayout) instead`,
          });
          return;
        }
      }
    },
  }),
});
