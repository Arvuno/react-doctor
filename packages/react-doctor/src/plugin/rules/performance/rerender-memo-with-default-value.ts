import { defineRule, isComponentAssignment, isUppercaseName } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const rerenderMemoWithDefaultValue = defineRule<Rule>({
  create: (context: RuleContext) => {
    const checkDefaultProps = (params: EsTreeNode[]): void => {
      for (const param of params) {
        if (param.type !== "ObjectPattern") continue;
        for (const property of param.properties ?? []) {
          if (property.type !== "Property" || property.value?.type !== "AssignmentPattern")
            continue;
          const defaultValue = property.value.right;
          if (defaultValue?.type === "ObjectExpression" && defaultValue.properties?.length === 0) {
            context.report({
              node: defaultValue,
              message:
                "Default prop value {} creates a new object reference every render — extract to a module-level constant",
            });
          }
          if (defaultValue?.type === "ArrayExpression" && defaultValue.elements?.length === 0) {
            context.report({
              node: defaultValue,
              message:
                "Default prop value [] creates a new array reference every render — extract to a module-level constant",
            });
          }
        }
      }
    };

    return {
      FunctionDeclaration(node: EsTreeNode) {
        if (!node.id?.name || !isUppercaseName(node.id.name)) return;
        checkDefaultProps(node.params ?? []);
      },
      VariableDeclarator(node: EsTreeNode) {
        if (!isComponentAssignment(node)) return;
        checkDefaultProps(node.init.params ?? []);
      },
    };
  },
});
