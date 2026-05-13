import { TANSTACK_SERVER_FN_NAMES } from "../../constants.js";
import { defineRule, getCalleeName, walkAst } from "../../utils/index.js";
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

export const tanstackStartServerFnValidateInput = defineRule<Rule>({
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (node.callee?.type !== "MemberExpression") return;
      if (node.callee.property?.type !== "Identifier") return;
      if (node.callee.property.name !== "handler") return;

      const chainInfo = walkServerFnChain(node);
      if (!chainInfo.isServerFnChain) return;

      const handlerFunction = node.arguments?.[0];
      if (!handlerFunction) return;

      let accessesData = false;
      walkAst(handlerFunction, (child: EsTreeNode) => {
        if (
          child.type === "MemberExpression" &&
          child.property?.type === "Identifier" &&
          child.property.name === "data"
        ) {
          accessesData = true;
        }
        if (
          child.type === "ObjectPattern" &&
          child.properties?.some(
            (property: EsTreeNode) =>
              property.key?.type === "Identifier" && property.key.name === "data",
          )
        ) {
          accessesData = true;
        }
      });

      if (accessesData && !chainInfo.hasInputValidator) {
        context.report({
          node,
          message:
            "Server function handler accesses data without inputValidator() — validate inputs crossing the network boundary",
        });
      }
    },
  }),
});
