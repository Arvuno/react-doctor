import { TANSTACK_ROUTE_CREATION_FUNCTIONS } from "../../constants.js";
import { defineRule, walkAst } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

const getRouteOptionsObject = (node: EsTreeNode): EsTreeNode | null => {
  if (node.type !== "CallExpression") return null;

  const callee = node.callee;

  if (callee?.type === "CallExpression" && callee.callee?.type === "Identifier") {
    if (!TANSTACK_ROUTE_CREATION_FUNCTIONS.has(callee.callee.name)) return null;
    const optionsArgument = node.arguments?.[0];
    if (optionsArgument?.type === "ObjectExpression") return optionsArgument;
    return null;
  }

  if (callee?.type === "Identifier") {
    if (!TANSTACK_ROUTE_CREATION_FUNCTIONS.has(callee.name)) return null;
    const optionsArgument = node.arguments?.[0];
    if (optionsArgument?.type === "ObjectExpression") return optionsArgument;
    return null;
  }

  return null;
};

const getPropertyKeyName = (property: EsTreeNode): string | null => {
  if (property.type !== "Property" && property.type !== "MethodDefinition") return null;
  if (property.key?.type === "Identifier") return property.key.name;
  if (property.key?.type === "Literal") return String(property.key.value);
  return null;
};

export const tanstackStartNoDirectFetchInLoader = defineRule<Rule>({
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      const optionsObject = getRouteOptionsObject(node);
      if (!optionsObject) return;

      const properties = optionsObject.properties ?? [];
      for (const property of properties) {
        const keyName = getPropertyKeyName(property);
        if (keyName !== "loader") continue;

        const loaderValue = property.value ?? property;
        walkAst(loaderValue, (child: EsTreeNode) => {
          if (child.type !== "CallExpression") return;
          if (child.callee?.type === "Identifier" && child.callee.name === "fetch") {
            context.report({
              node: child,
              message:
                "Direct fetch() in route loader — use createServerFn() for type-safe server logic with automatic RPC",
            });
          }
        });
      }
    },
  }),
});
