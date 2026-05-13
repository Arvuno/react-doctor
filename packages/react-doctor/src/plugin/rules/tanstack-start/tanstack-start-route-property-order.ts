import {
  TANSTACK_ROUTE_CREATION_FUNCTIONS,
  TANSTACK_ROUTE_PROPERTY_ORDER,
} from "../../constants.js";
import { defineRule } from "../../utils/index.js";
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

export const tanstackStartRoutePropertyOrder = defineRule<Rule>({
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      const optionsObject = getRouteOptionsObject(node);
      if (!optionsObject) return;

      const properties: EsTreeNode[] = optionsObject.properties ?? [];
      const orderedPropertyNames: string[] = [];
      for (const property of properties) {
        const propertyName = getPropertyKeyName(property);
        if (propertyName !== null) {
          orderedPropertyNames.push(propertyName);
        }
      }

      const sensitiveProperties = orderedPropertyNames.filter((propertyName) =>
        TANSTACK_ROUTE_PROPERTY_ORDER.includes(propertyName),
      );

      let lastIndex = -1;
      for (const propertyName of sensitiveProperties) {
        const currentIndex = TANSTACK_ROUTE_PROPERTY_ORDER.indexOf(propertyName);
        if (currentIndex < lastIndex) {
          const expectedBefore = TANSTACK_ROUTE_PROPERTY_ORDER[lastIndex];
          context.report({
            node: optionsObject,
            message: `Route property "${propertyName}" must come before "${expectedBefore}" — wrong order breaks TypeScript type inference`,
          });
          return;
        }
        lastIndex = currentIndex;
      }
    },
  }),
});
