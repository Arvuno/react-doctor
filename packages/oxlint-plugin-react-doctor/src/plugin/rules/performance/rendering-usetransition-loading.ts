import { LOADING_STATE_PATTERN } from "../../constants/react.js";
import { defineRule } from "../../utils/define-rule.js";
import type { EsTreeNode } from "../../utils/es-tree-node.js";
import { isHookCall } from "../../utils/is-hook-call.js";
import type { Rule } from "../../utils/rule.js";
import type { RuleContext } from "../../utils/rule-context.js";
import { isNodeOfType } from "../../utils/is-node-of-type.js";
import type { EsTreeNodeOfType } from "../../utils/es-tree-node-of-type.js";
import { walkAst } from "../../utils/walk-ast.js";

// Walks up to find the function-like that owns this VariableDeclarator
// (component body / hook body). `useTransition` is only an alternative
// to `useState(false)` when the loading flag guards a SYNC state
// transition. If the enclosing function body contains an `await`
// (anywhere — including in nested helper arrow functions defined in
// the same body), the flag is tracking async work and the rule's
// recommendation doesn't apply.
const enclosingFunctionBody = (node: EsTreeNode): EsTreeNode | null => {
  let cursor: EsTreeNode | null | undefined = node.parent;
  while (cursor) {
    if (
      isNodeOfType(cursor, "FunctionDeclaration") ||
      isNodeOfType(cursor, "FunctionExpression") ||
      isNodeOfType(cursor, "ArrowFunctionExpression")
    ) {
      return (cursor as { body: EsTreeNode | null }).body ?? null;
    }
    cursor = cursor.parent ?? null;
  }
  return null;
};

const containsAwait = (root: EsTreeNode | null): boolean => {
  if (!root) return false;
  let found = false;
  walkAst(root, (child: EsTreeNode) => {
    if (found) return;
    if (isNodeOfType(child, "AwaitExpression")) {
      found = true;
    }
  });
  return found;
};

// Identifiers that, when present alongside a loading useState, strongly
// signal async data fetching (not a transition). The rule's
// recommendation to use `useTransition` only applies to UI-state-only
// flips; an Apollo / TanStack / SWR / fetch hook caller is doing real
// I/O that React can't optimize away.
const ASYNC_DATA_CALLEE_NAMES: ReadonlySet<string> = new Set([
  "useApolloClient",
  "useMutation",
  "useQuery",
  "useLazyQuery",
  "useSubscription",
  "useSWR",
  "useSWRMutation",
  "useSWRInfinite",
  "fetch",
  "axios",
]);

const referencesAsyncDataApi = (body: EsTreeNode | null): boolean => {
  if (!body) return false;
  let found = false;
  walkAst(body, (child: EsTreeNode) => {
    if (found) return;
    if (isNodeOfType(child, "CallExpression")) {
      const callee = child.callee;
      if (isNodeOfType(callee, "Identifier") && ASYNC_DATA_CALLEE_NAMES.has(callee.name)) {
        found = true;
        return;
      }
      if (
        isNodeOfType(callee, "MemberExpression") &&
        isNodeOfType(callee.property, "Identifier") &&
        ASYNC_DATA_CALLEE_NAMES.has(callee.property.name)
      ) {
        found = true;
        return;
      }
    }
  });
  return found;
};

export const renderingUsetransitionLoading = defineRule<Rule>({
  id: "rendering-usetransition-loading",
  severity: "warn",
  recommendation:
    "Replace with `const [isPending, startTransition] = useTransition()` — avoids a re-render for the loading state",
  create: (context: RuleContext) => ({
    VariableDeclarator(node: EsTreeNodeOfType<"VariableDeclarator">) {
      if (!isNodeOfType(node.id, "ArrayPattern") || !node.id.elements?.length) return;
      if (!node.init || !isHookCall(node.init, "useState")) return;
      if (!isNodeOfType(node.init, "CallExpression")) return;
      if (!node.init.arguments?.length) return;

      const initializer = node.init.arguments[0];
      if (!isNodeOfType(initializer, "Literal") || initializer.value !== false) return;

      const firstBinding = node.id.elements[0];
      const stateVariableName = isNodeOfType(firstBinding, "Identifier") ? firstBinding.name : null;
      if (!stateVariableName || !LOADING_STATE_PATTERN.test(stateVariableName)) return;

      // Async-work loading states aren't transition candidates — there's
      // a real I/O suspension that React can't elide. Detect either an
      // `await` anywhere in the enclosing function body OR a call to a
      // known async-data hook / global.
      const fnBody = enclosingFunctionBody(node as EsTreeNode);
      if (fnBody && (containsAwait(fnBody) || referencesAsyncDataApi(fnBody))) {
        return;
      }

      context.report({
        node: node.init,
        message: `useState for "${stateVariableName}" — if this guards a state transition (not an async fetch), consider useTransition instead`,
      });
    },
  }),
});
