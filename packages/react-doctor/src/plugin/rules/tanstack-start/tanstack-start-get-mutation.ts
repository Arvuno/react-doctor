import { MUTATING_HTTP_METHODS, TANSTACK_SERVER_FN_NAMES } from "../../constants.js";
import { defineRule, findSideEffect, getCalleeName } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

interface ServerFnChainInfo {
  isServerFnChain: boolean;
  specifiedMethod: string | null;
  hasInputValidator: boolean;
}

const walkServerFnChain = (outerNode: EsTreeNode): ServerFnChainInfo => {
  const result: ServerFnChainInfo = {
    isServerFnChain: false,
    specifiedMethod: null,
    hasInputValidator: false,
  };

  let currentNode: EsTreeNode = outerNode.callee?.object;

  while (currentNode?.type === "CallExpression") {
    const calleeName = getCalleeName(currentNode);

    if (calleeName && TANSTACK_SERVER_FN_NAMES.has(calleeName)) {
      result.isServerFnChain = true;

      const optionsArgument = currentNode.arguments?.[0];
      if (optionsArgument?.type === "ObjectExpression") {
        for (const property of optionsArgument.properties ?? []) {
          if (
            property.key?.type === "Identifier" &&
            property.key.name === "method" &&
            property.value?.type === "Literal" &&
            typeof property.value.value === "string"
          ) {
            result.specifiedMethod = property.value.value;
          }
        }
      }
    }

    if (calleeName === "inputValidator") {
      result.hasInputValidator = true;
    }

    if (currentNode.callee?.type === "MemberExpression") {
      currentNode = currentNode.callee.object;
    } else {
      break;
    }
  }

  return result;
};

export const tanstackStartGetMutation = defineRule<Rule>({
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (node.callee?.type !== "MemberExpression") return;
      if (node.callee.property?.type !== "Identifier" || node.callee.property.name !== "handler")
        return;

      const chainInfo = walkServerFnChain(node);
      if (!chainInfo.isServerFnChain) return;
      if (
        chainInfo.specifiedMethod &&
        MUTATING_HTTP_METHODS.has(chainInfo.specifiedMethod.toUpperCase())
      )
        return;

      const handlerFunction = node.arguments?.[0];
      if (!handlerFunction) return;

      const sideEffect = findSideEffect(handlerFunction);
      if (sideEffect) {
        context.report({
          node,
          message: `GET server function has side effects (${sideEffect}) — use createServerFn({ method: 'POST' }) for mutations`,
        });
      }
    },
  }),
});
