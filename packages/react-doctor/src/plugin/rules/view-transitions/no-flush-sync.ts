import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

// HACK: `flushSync` from react-dom forces a synchronous flush, which
// skips the View Transition snapshot phase entirely — any animation that
// would have triggered is silently dropped. We report only on the import
// (a single actionable diagnostic per file) instead of on every call
// site, which would clutter output for files with several flushSync()s.
export const noFlushSync = defineRule<Rule>({
  create: (context: RuleContext) => ({
    ImportDeclaration(node: EsTreeNode) {
      if (node.source?.value !== "react-dom") return;
      for (const specifier of node.specifiers ?? []) {
        if (specifier.type !== "ImportSpecifier") continue;
        if (specifier.imported?.name === "flushSync") {
          context.report({
            node: specifier,
            message:
              "flushSync from react-dom skips View Transition snapshots and concurrent rendering — prefer startTransition for non-urgent updates",
          });
        }
      }
    },
  }),
});
