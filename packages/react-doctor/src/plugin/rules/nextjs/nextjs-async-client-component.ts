import {
  defineRule,
  hasDirective,
  isComponentAssignment,
  isUppercaseName,
} from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const nextjsAsyncClientComponent = defineRule<Rule>({
  create: (context: RuleContext) => {
    let fileHasUseClient = false;

    return {
      Program(programNode: EsTreeNode) {
        fileHasUseClient = hasDirective(programNode, "use client");
      },
      FunctionDeclaration(node: EsTreeNode) {
        if (!fileHasUseClient || !node.async) return;
        if (!node.id?.name || !isUppercaseName(node.id.name)) return;
        context.report({
          node,
          message: `Async client component "${node.id.name}" — client components cannot be async`,
        });
      },
      VariableDeclarator(node: EsTreeNode) {
        if (!fileHasUseClient) return;
        if (!isComponentAssignment(node) || !node.init?.async) return;
        context.report({
          node,
          message: `Async client component "${node.id.name}" — client components cannot be async`,
        });
      },
    };
  },
});
