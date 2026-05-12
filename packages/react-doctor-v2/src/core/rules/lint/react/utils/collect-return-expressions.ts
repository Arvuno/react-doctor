import type { EsTreeNode } from "../../utils/index.js";
import { isNodeOfType } from "../../utils/index.js";
import { walkInsideStatementBlocks } from "../../utils/index.js";

export const collectReturnExpressions = (componentBody: EsTreeNode): EsTreeNode[] => {
  if (!isNodeOfType(componentBody, "BlockStatement")) return [];
  const returns: EsTreeNode[] = [];
  for (const statement of componentBody.body ?? []) {
    if (isNodeOfType(statement, "ReturnStatement") && statement.argument) {
      returns.push(statement.argument);
      continue;
    }
    // Walk into IfStatement / TryStatement etc. for early-return JSX,
    // but stop at any nested function.
    walkInsideStatementBlocks(statement, (child) => {
      if (isNodeOfType(child, "ReturnStatement") && child.argument) {
        returns.push(child.argument);
      }
    });
  }
  return returns;
};
