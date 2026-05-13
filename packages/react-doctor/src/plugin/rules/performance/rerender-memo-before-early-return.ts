import {
  defineRule,
  isComponentAssignment,
  isHookCall,
  isUppercaseName,
} from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

const callbackReturnsJsx = (callback: EsTreeNode | undefined): boolean => {
  if (!callback) return false;
  if (callback.type !== "ArrowFunctionExpression" && callback.type !== "FunctionExpression") {
    return false;
  }
  const body = callback.body;
  if (body?.type === "JSXElement" || body?.type === "JSXFragment") return true;
  if (body?.type !== "BlockStatement") return false;
  for (const stmt of body.body ?? []) {
    if (
      stmt.type === "ReturnStatement" &&
      (stmt.argument?.type === "JSXElement" || stmt.argument?.type === "JSXFragment")
    ) {
      return true;
    }
  }
  return false;
};

const containsEarlyReturn = (ifStatement: EsTreeNode): boolean => {
  const consequent = ifStatement.consequent;
  if (!consequent) return false;
  if (consequent.type === "ReturnStatement") return true;
  if (consequent.type !== "BlockStatement") return false;
  for (const stmt of consequent.body ?? []) {
    if (stmt.type === "ReturnStatement") return true;
  }
  return false;
};

// HACK: `useMemo(() => <jsx/>)` followed by an early return wastes the
// memoization — the useMemo callback runs every render even when the
// component bails out (loading, gated, etc.). Better to extract the JSX
// into a memoized child component so the parent's early return
// short-circuits before the child renders.
export const rerenderMemoBeforeEarlyReturn = defineRule<Rule>({
  create: (context: RuleContext) => {
    const inspectFunctionBody = (statements: EsTreeNode[]): void => {
      let memoNode: EsTreeNode | null = null;

      for (const stmt of statements) {
        if (!memoNode) {
          if (stmt.type !== "VariableDeclaration") continue;
          for (const declarator of stmt.declarations ?? []) {
            const init = declarator.init;
            if (
              init?.type === "CallExpression" &&
              isHookCall(init, "useMemo") &&
              callbackReturnsJsx(init.arguments?.[0])
            ) {
              memoNode = declarator;
              break;
            }
          }
          continue;
        }
        if (stmt.type === "IfStatement" && containsEarlyReturn(stmt)) {
          context.report({
            node: memoNode,
            message:
              "useMemo returning JSX runs before an early return — extract the JSX into a memoized child component so the parent bails out before the subtree renders",
          });
          return;
        }
      }
    };

    return {
      FunctionDeclaration(node: EsTreeNode) {
        if (!isUppercaseName(node.id?.name ?? "")) return;
        if (node.body?.type !== "BlockStatement") return;
        inspectFunctionBody(node.body.body ?? []);
      },
      VariableDeclarator(node: EsTreeNode) {
        if (!isComponentAssignment(node)) return;
        const body = node.init?.body;
        if (body?.type !== "BlockStatement") return;
        inspectFunctionBody(body.body ?? []);
      },
    };
  },
});
