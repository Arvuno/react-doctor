import { EFFECT_HOOK_NAMES } from "../../constants/react.js";
import { CASCADING_SET_STATE_THRESHOLD } from "../../constants/thresholds.js";
import { defineRule } from "../../utils/define-rule.js";
import type { EsTreeNode } from "../../utils/es-tree-node.js";
import { getEffectCallback } from "../../utils/get-effect-callback.js";
import { isHookCall } from "../../utils/is-hook-call.js";
import { isNodeOfType } from "../../utils/is-node-of-type.js";
import { isSetterCall } from "../../utils/is-setter-call.js";
import type { Rule } from "../../utils/rule.js";
import type { RuleContext } from "../../utils/rule-context.js";
import type { EsTreeNodeOfType } from "../../utils/es-tree-node-of-type.js";

// Count setState calls along a SINGLE execution path. For if/else
// branches and switch/case alternatives, take the MAX of the branches
// (only one fires per render) instead of SUM. ASYNC function bodies
// are NOT walked — their setStates fire across async boundaries on
// separate render cycles (the canonical fetch pattern
// `setStatus('loading'); await fetch(); setData(d); setStatus('idle')`
// is 3 setStates separated by awaits, not 3 cascading synchronous
// updates that need a reducer).
const isAsyncFunctionLike = (node: EsTreeNode): boolean => {
  if (
    isNodeOfType(node, "ArrowFunctionExpression") ||
    isNodeOfType(node, "FunctionExpression") ||
    isNodeOfType(node, "FunctionDeclaration")
  ) {
    return Boolean((node as { async?: boolean }).async);
  }
  return false;
};

const countMaxPathSetStateCalls = (node: EsTreeNode): number => {
  if (!node || typeof node !== "object") return 0;
  // Async function bodies — see comment above. Sync function bodies
  // (callbacks for `.then(...)`, `setTimeout(...)`, etc.) are still
  // walked because their setStates DO compound when fired together.
  if (isAsyncFunctionLike(node)) return 0;
  // If/else: max of branches (only one fires).
  if (isNodeOfType(node, "IfStatement")) {
    const thenCount = countMaxPathSetStateCalls(node.consequent as EsTreeNode);
    const elseCount = node.alternate
      ? countMaxPathSetStateCalls(node.alternate as EsTreeNode)
      : 0;
    return Math.max(thenCount, elseCount);
  }
  // Conditional expression — same logic.
  if (isNodeOfType(node, "ConditionalExpression")) {
    return Math.max(
      countMaxPathSetStateCalls(node.consequent as EsTreeNode),
      countMaxPathSetStateCalls(node.alternate as EsTreeNode),
    );
  }
  // Switch: max across cases (only one matches per dispatch).
  if (isNodeOfType(node, "SwitchStatement")) {
    let maxCase = 0;
    for (const switchCase of node.cases ?? []) {
      let caseCount = 0;
      for (const statement of (switchCase as EsTreeNodeOfType<"SwitchCase">).consequent ?? []) {
        caseCount += countMaxPathSetStateCalls(statement as EsTreeNode);
      }
      if (caseCount > maxCase) maxCase = caseCount;
    }
    return maxCase;
  }
  // Try/catch/finally: max(try, catch) (only one path runs on
  // success vs throw) + finally (always runs).
  if (isNodeOfType(node, "TryStatement")) {
    const tryCount = countMaxPathSetStateCalls(node.block as EsTreeNode);
    const catchCount = node.handler
      ? countMaxPathSetStateCalls(
          (node.handler as { body: EsTreeNode }).body,
        )
      : 0;
    const finallyCount = node.finalizer
      ? countMaxPathSetStateCalls(node.finalizer as EsTreeNode)
      : 0;
    return Math.max(tryCount, catchCount) + finallyCount;
  }
  // Direct setter call.
  if (isSetterCall(node)) return 1;
  // Walk children, summing — sequential statements compound.
  let total = 0;
  const nodeRecord = node as unknown as Record<string, unknown>;
  for (const key of Object.keys(nodeRecord)) {
    if (key === "parent") continue;
    const child = nodeRecord[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === "object" && "type" in item) {
          total += countMaxPathSetStateCalls(item as EsTreeNode);
        }
      }
    } else if (child && typeof child === "object" && "type" in child) {
      total += countMaxPathSetStateCalls(child as EsTreeNode);
    }
  }
  return total;
};

// `useEffect(() => { setX(...); setY(...); setZ(...); }, [])` is the
// canonical mount-time initialisation pattern — N independent state
// atoms set ONCE on first render. The rule's "use useReducer"
// recommendation is overkill here: a reducer doesn't reduce the call
// count, it just hides the same N writes behind a switch. Reactivity
// concerns about cascading re-renders don't apply because there's no
// dep-driven re-execution.
const isInitOnlyEffect = (node: EsTreeNodeOfType<"CallExpression">): boolean => {
  const depsArg = node.arguments?.[1] as EsTreeNode | undefined;
  if (!depsArg) return false;
  if (!isNodeOfType(depsArg, "ArrayExpression")) return false;
  return (depsArg.elements ?? []).length === 0;
};

export const noCascadingSetState = defineRule<Rule>({
  id: "no-cascading-set-state",
  severity: "warn",
  tags: ["test-noise"],
  recommendation:
    "Combine into useReducer: `const [state, dispatch] = useReducer(reducer, initialState)`",
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNodeOfType<"CallExpression">) {
      if (!isHookCall(node, EFFECT_HOOK_NAMES)) return;
      if (isInitOnlyEffect(node)) return;
      const callback = getEffectCallback(node);
      if (!callback) return;

      const setStateCallCount = countMaxPathSetStateCalls(callback);
      if (setStateCallCount >= CASCADING_SET_STATE_THRESHOLD) {
        context.report({
          node,
          message: `${setStateCallCount} setState calls in a single useEffect — consider using useReducer or deriving state`,
        });
      }
    },
  }),
});
