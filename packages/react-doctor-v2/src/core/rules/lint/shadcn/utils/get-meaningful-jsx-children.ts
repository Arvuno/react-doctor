import type { EsTreeNode } from "../../utils/index.js";
import { isNodeOfType } from "../../utils/index.js";

export const getMeaningfulJsxChildren = (node: EsTreeNode): EsTreeNode[] =>
  (node.children ?? []).filter((child: EsTreeNode) => {
    if (!isNodeOfType(child, "JSXText")) return true;
    return child.value.trim().length > 0;
  });
