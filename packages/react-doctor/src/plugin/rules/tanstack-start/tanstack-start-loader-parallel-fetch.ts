import {
  SEQUENTIAL_AWAIT_THRESHOLD_FOR_LOADER,
  TANSTACK_ROUTE_CREATION_FUNCTIONS,
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

const hasTopLevelAwait = (statement: EsTreeNode): boolean => {
  if (statement.type === "VariableDeclaration") {
    return statement.declarations?.some(
      (declarator: EsTreeNode) => declarator.init?.type === "AwaitExpression",
    );
  }
  if (statement.type === "ExpressionStatement") {
    return (
      statement.expression?.type === "AwaitExpression" ||
      (statement.expression?.type === "AssignmentExpression" &&
        statement.expression.right?.type === "AwaitExpression")
    );
  }
  if (statement.type === "ReturnStatement") {
    return statement.argument?.type === "AwaitExpression";
  }
  if (statement.type === "ForOfStatement" && statement.await) {
    return true;
  }
  return false;
};

export const tanstackStartLoaderParallelFetch = defineRule<Rule>({
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      const optionsObject = getRouteOptionsObject(node);
      if (!optionsObject) return;

      const properties = optionsObject.properties ?? [];
      for (const property of properties) {
        const keyName = getPropertyKeyName(property);
        if (keyName !== "loader") continue;

        const loaderValue = property.value;
        if (
          !loaderValue ||
          (loaderValue.type !== "ArrowFunctionExpression" &&
            loaderValue.type !== "FunctionExpression")
        )
          continue;

        const functionBody = loaderValue.body;
        if (!functionBody || functionBody.type !== "BlockStatement") continue;

        let sequentialAwaitCount = 0;
        for (const statement of functionBody.body ?? []) {
          if (hasTopLevelAwait(statement)) {
            sequentialAwaitCount++;
          }

          if (sequentialAwaitCount >= SEQUENTIAL_AWAIT_THRESHOLD_FOR_LOADER) {
            context.report({
              node: property,
              message:
                "Multiple sequential awaits in loader — use Promise.all() to fetch data in parallel and avoid waterfalls",
            });
            break;
          }
        }
      }
    },
  }),
});
