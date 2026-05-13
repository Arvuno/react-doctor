import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

const resolveJsxElementName = (openingElement: EsTreeNode): string | null => {
  const elementName = openingElement?.name;
  if (!elementName) return null;
  if (elementName.type === "JSXIdentifier") return elementName.name;
  if (elementName.type === "JSXMemberExpression") return elementName.property?.name ?? null;
  return null;
};

// Short-name form: resolveJsxElementName drops the `Animated.` prefix,
// so `<Animated.FlatList>` resolves to `"FlatList"` and matches here.
const VIRTUALIZED_LIST_NAMES = new Set([
  "FlatList",
  "FlashList",
  "LegendList",
  "SectionList",
  "VirtualizedList",
]);

// HACK: virtualized lists key off referential equality of `data`. Passing
// `data={items.map(...)}` allocates a fresh array on every parent render,
// which forces the list to re-key every row and bust its memo cache,
// destroying scroll perf. Hoist the transform into a useMemo at list
// scope or do the projection earlier in the parent.
export const rnListDataMapped = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      const elementName = resolveJsxElementName(node);
      if (!elementName || !VIRTUALIZED_LIST_NAMES.has(elementName)) return;

      for (const attr of node.attributes ?? []) {
        if (attr.type !== "JSXAttribute") continue;
        if (attr.name?.type !== "JSXIdentifier" || attr.name.name !== "data") continue;
        if (attr.value?.type !== "JSXExpressionContainer") continue;
        const expression = attr.value.expression;
        if (expression?.type !== "CallExpression") continue;
        if (expression.callee?.type !== "MemberExpression") continue;
        if (expression.callee.property?.type !== "Identifier") continue;
        const methodName = expression.callee.property.name;
        if (methodName !== "map" && methodName !== "filter") continue;

        context.report({
          node: attr,
          message: `<${elementName} data={items.${methodName}(...)}> allocates a fresh array per render — wrap in useMemo at list scope so the data reference stays stable across parent renders`,
        });
        return;
      }
    },
  }),
});
