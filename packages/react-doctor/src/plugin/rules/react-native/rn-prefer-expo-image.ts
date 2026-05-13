import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

// HACK: react-native's built-in <Image> has no caching, no placeholders,
// no progressive loading, and no priority hints. expo-image is a drop-in
// replacement (same prop API plus more) with disk + memory caching, blur
// placeholders, and crossfades — a major perceived-perf win for any list
// or hero image.
export const rnPreferExpoImage = defineRule<Rule>({
  create: (context: RuleContext) => ({
    ImportDeclaration(node: EsTreeNode) {
      if (node.source?.value !== "react-native") return;
      for (const specifier of node.specifiers ?? []) {
        if (specifier.type !== "ImportSpecifier") continue;
        if (specifier.imported?.name !== "Image") continue;
        context.report({
          node: specifier,
          message:
            "Importing Image from react-native — prefer expo-image for caching, placeholders, and progressive loading (drop-in API)",
        });
      }
    },
  }),
});
