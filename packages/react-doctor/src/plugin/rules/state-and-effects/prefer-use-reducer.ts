import { RELATED_USE_STATE_THRESHOLD } from "../../constants.js";
import {
  defineRule,
  isComponentAssignment,
  isHookCall,
  isUppercaseName,
} from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const preferUseReducer = defineRule<Rule>({
  create: (context: RuleContext) => {
    const reportExcessiveUseState = (body: EsTreeNode, componentName: string): void => {
      if (body.type !== "BlockStatement") return;
      let useStateCount = 0;
      for (const statement of body.body ?? []) {
        if (statement.type !== "VariableDeclaration") continue;
        for (const declarator of statement.declarations ?? []) {
          if (declarator.init && isHookCall(declarator.init, "useState")) useStateCount++;
        }
      }
      if (useStateCount >= RELATED_USE_STATE_THRESHOLD) {
        context.report({
          node: body,
          message: `Component "${componentName}" has ${useStateCount} useState calls — consider useReducer for related state`,
        });
      }
    };

    return {
      FunctionDeclaration(node: EsTreeNode) {
        if (!node.id?.name || !isUppercaseName(node.id.name)) return;
        reportExcessiveUseState(node.body, node.id.name);
      },
      VariableDeclarator(node: EsTreeNode) {
        if (!isComponentAssignment(node)) return;
        reportExcessiveUseState(node.init.body, node.id.name);
      },
    };
  },
});
