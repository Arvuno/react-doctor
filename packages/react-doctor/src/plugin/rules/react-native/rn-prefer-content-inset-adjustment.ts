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

// HACK: <SafeAreaView> wrapping <ScrollView> (or
// `useSafeAreaInsets()` + `paddingTop: insets.top` in
// `contentContainerStyle`) is the legacy way to handle safe areas.
// Modern RN exposes `contentInsetAdjustmentBehavior="automatic"` which
// the OS computes natively, integrating with sticky headers, large
// titles, and keyboard avoidance for free.
export const rnPreferContentInsetAdjustment = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXElement(node: EsTreeNode) {
      const elementName = resolveJsxElementName(node.openingElement);
      if (elementName !== "SafeAreaView") return;

      for (const child of node.children ?? []) {
        if (child.type !== "JSXElement") continue;
        const childName = resolveJsxElementName(child.openingElement);
        if (!childName || !SCROLLVIEW_NAMES.has(childName)) continue;

        context.report({
          node,
          message:
            '<SafeAreaView> wrapping <ScrollView> — set `contentInsetAdjustmentBehavior="automatic"` on the ScrollView and drop the SafeAreaView wrapper for native safe-area handling',
        });
        return;
      }
    },
  }),
});
