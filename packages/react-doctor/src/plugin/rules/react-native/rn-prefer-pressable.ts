import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

const TOUCHABLE_COMPONENTS = new Set([
  "TouchableOpacity",
  "TouchableHighlight",
  "TouchableWithoutFeedback",
  "TouchableNativeFeedback",
]);

// HACK: TouchableOpacity / TouchableHighlight / TouchableWithoutFeedback /
// TouchableNativeFeedback are legacy and feature-frozen. Pressable is the
// modern, more configurable, more accessible replacement that works the
// same on iOS, Android, and Fabric.
export const rnPreferPressable = defineRule<Rule>({
  create: (context: RuleContext) => ({
    ImportDeclaration(node: EsTreeNode) {
      if (node.source?.value !== "react-native") return;
      for (const specifier of node.specifiers ?? []) {
        if (specifier.type !== "ImportSpecifier") continue;
        const importedName = specifier.imported?.name;
        if (!importedName || !TOUCHABLE_COMPONENTS.has(importedName)) continue;
        context.report({
          node: specifier,
          message: `${importedName} is legacy — use <Pressable> from react-native (or react-native-gesture-handler) for modern press handling`,
        });
      }
    },
  }),
});
