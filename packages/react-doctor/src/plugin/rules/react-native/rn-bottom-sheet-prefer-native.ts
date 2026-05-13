import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

const JS_BOTTOM_SHEET_PACKAGES = new Set([
  "@gorhom/bottom-sheet",
  "react-native-bottom-sheet",
  "react-native-modal-bottom-sheet",
  "react-native-raw-bottom-sheet",
]);

// HACK: JS-implemented bottom sheets (gorhom/bottom-sheet et al.) do all
// their gesture handling and animation on the JS thread, which is laggy
// for the kind of velocity-tracking interactions a bottom sheet needs.
// React Native v7+ ships a native form sheet via <Modal presentationStyle=
// "formSheet"> that handles gestures, snap points, and detents on the
// platform's native modal stack.
export const rnBottomSheetPreferNative = defineRule<Rule>({
  create: (context: RuleContext) => ({
    ImportDeclaration(node: EsTreeNode) {
      const source = node.source?.value;
      if (typeof source !== "string" || !JS_BOTTOM_SHEET_PACKAGES.has(source)) return;
      context.report({
        node,
        message: `${source} is a JS-implemented bottom sheet — for v7+ RN, prefer <Modal presentationStyle="formSheet"> for native gesture handling and snap points`,
      });
    },
  }),
});
