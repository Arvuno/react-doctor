import { DEPRECATED_RN_MODULE_REPLACEMENTS } from "../../constants.js";
import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const rnNoDeprecatedModules = defineRule<Rule>({
  create: (context: RuleContext) => ({
    ImportDeclaration(node: EsTreeNode) {
      if (node.source?.value !== "react-native") return;

      for (const specifier of node.specifiers ?? []) {
        if (specifier.type !== "ImportSpecifier") continue;
        const importedName = specifier.imported?.name;
        if (!importedName) continue;

        const replacement = DEPRECATED_RN_MODULE_REPLACEMENTS.get(importedName);
        if (!replacement) continue;

        context.report({
          node: specifier,
          message: `"${importedName}" was removed from react-native — use ${replacement} instead`,
        });
      }
    },
  }),
});
