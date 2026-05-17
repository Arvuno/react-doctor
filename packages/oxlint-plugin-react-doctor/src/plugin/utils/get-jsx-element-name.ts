import type { EsTreeNodeOfType } from "./es-tree-node-of-type.js";
import { isNodeOfType } from "./is-node-of-type.js";

export const getJsxElementName = (
  openingElement: EsTreeNodeOfType<"JSXOpeningElement">,
): string => {
  const name = openingElement.name;
  if (isNodeOfType(name, "JSXIdentifier")) return name.name;
  if (isNodeOfType(name, "JSXMemberExpression")) {
    const parts: string[] = [];
    let current: unknown = name;
    while (isNodeOfType(current, "JSXMemberExpression")) {
      parts.unshift(isNodeOfType(current.property, "JSXIdentifier") ? current.property.name : "");
      current = current.object;
    }
    if (isNodeOfType(current, "JSXIdentifier")) parts.unshift(current.name);
    return parts.join(".");
  }
  return "";
};
