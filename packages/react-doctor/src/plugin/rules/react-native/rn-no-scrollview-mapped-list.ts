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

// HACK: <ScrollView>{items.map(...)}</ScrollView> renders every row in
// memory — for any list longer than ~10 items this destroys scroll
// performance on lower-end devices. FlashList / LegendList / FlatList
// recycle row components and only mount the visible window. The cost
// of switching is tiny (same prop API) and the perf win is huge.
export const rnNoScrollviewMappedList = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXElement(node: EsTreeNode) {
      const elementName = resolveJsxElementName(node.openingElement);
      if (!elementName || !SCROLLVIEW_NAMES.has(elementName)) return;

      for (const child of node.children ?? []) {
        if (child.type !== "JSXExpressionContainer") continue;
        const expression = child.expression;
        if (
          expression?.type === "CallExpression" &&
          expression.callee?.type === "MemberExpression" &&
          expression.callee.property?.type === "Identifier" &&
          expression.callee.property.name === "map"
        ) {
          context.report({
            node: child,
            message: `<${elementName}> rendering items.map(...) — use FlashList, LegendList, or FlatList so only visible rows mount`,
          });
          return;
        }
      }
    },
  }),
});
