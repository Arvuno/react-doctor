import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

const resolveJsxElementName = (openingElement: EsTreeNode): string | null => {
  const elementName = openingElement?.name;
  if (!elementName) return null;
  if (elementName.type === "JSXIdentifier") return elementName.name;
  if (elementName.type === "JSXMemberExpression") return elementName.property?.name ?? null;
  return null;
};

// HACK: <FlashList recycleItems> (or LegendList) reuses row component
// instances across rows. For HETEROGENEOUS lists (rows of different
// types — section headers, message bubbles, separators), recycling
// without `getItemType` causes wrong-type rows to mount into the
// recycled cells and produces flickers / measurement errors. The fix
// is to provide `getItemType={item => item.kind}` (or similar) so
// FlashList keeps separate recycle pools per type.
//
// Heuristic: <FlashList recycleItems> AND `<FlashList renderItem={...}>`
// where the renderItem return type is varied (multiple JSX element
// names returned via conditional / branching). We approximate by
// flagging any FlashList/LegendList with `recycleItems` and no
// `getItemType` — the user can add `getItemType` if they have one
// item type, in which case the rule is silent.
const RECYCLABLE_LIST_NAMES = new Set(["FlashList", "LegendList"]);

export const rnListRecyclableWithoutTypes = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      const elementName = resolveJsxElementName(node);
      if (!elementName || !RECYCLABLE_LIST_NAMES.has(elementName)) return;

      let hasRecycleItemsEnabled = false;
      let hasGetItemType = false;

      for (const attr of node.attributes ?? []) {
        if (attr.type !== "JSXAttribute") continue;
        if (attr.name?.type !== "JSXIdentifier") continue;
        if (attr.name.name === "recycleItems") {
          // Bare `recycleItems` (no `={...}`) → true. `recycleItems={true}`
          // → true. `recycleItems={false}` → DISABLES recycling, so the
          // rule shouldn't fire.
          if (!attr.value) {
            hasRecycleItemsEnabled = true;
          } else if (
            attr.value.type === "JSXExpressionContainer" &&
            attr.value.expression?.type === "Literal"
          ) {
            hasRecycleItemsEnabled = attr.value.expression.value === true;
          } else {
            // Dynamic value: assume it can be true.
            hasRecycleItemsEnabled = true;
          }
        }
        if (attr.name.name === "getItemType") hasGetItemType = true;
      }

      if (hasRecycleItemsEnabled && !hasGetItemType) {
        context.report({
          node,
          message: `<${elementName} recycleItems> without \`getItemType\` — heterogeneous rows mount into the wrong recycled cells. Add \`getItemType={item => item.kind}\` so FlashList keeps separate recycle pools per type`,
        });
      }
    },
  }),
});
