import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const jsBatchDomCss = defineRule<Rule>({
  create: (context: RuleContext) => {
    const isStyleAssignment = (node: EsTreeNode): boolean =>
      node.type === "ExpressionStatement" &&
      node.expression?.type === "AssignmentExpression" &&
      node.expression.left?.type === "MemberExpression" &&
      node.expression.left.object?.type === "MemberExpression" &&
      node.expression.left.object.property?.type === "Identifier" &&
      node.expression.left.object.property.name === "style";

    return {
      BlockStatement(node: EsTreeNode) {
        const statements = node.body ?? [];
        for (let statementIndex = 1; statementIndex < statements.length; statementIndex++) {
          if (
            isStyleAssignment(statements[statementIndex]) &&
            isStyleAssignment(statements[statementIndex - 1])
          ) {
            context.report({
              node: statements[statementIndex],
              message:
                "Multiple sequential element.style assignments — batch with cssText or classList for fewer reflows",
            });
          }
        }
      },
    };
  },
});
