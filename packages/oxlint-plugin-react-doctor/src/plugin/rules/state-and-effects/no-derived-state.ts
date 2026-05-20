import type { Reference } from "eslint-scope";
import { defineRule } from "../../utils/define-rule.js";
import type { EsTreeNode } from "../../utils/es-tree-node.js";
import type { EsTreeNodeOfType } from "../../utils/es-tree-node-of-type.js";
import { isNodeOfType } from "../../utils/is-node-of-type.js";
import type { Rule } from "../../utils/rule.js";
import type { RuleContext } from "../../utils/rule-context.js";
import {
  getArgsUpstreamRefs,
  getCallExpr,
  getUpstreamRefs,
  isSynchronous,
} from "./utils/effect/ast.js";
import { getProgramAnalysis } from "./utils/effect/get-program-analysis.js";
import {
  getEffectDepsRefs,
  getEffectFn,
  getEffectFnRefs,
  getUseStateDecl,
  hasCleanup,
  isProp,
  isState,
  isStateSetterCall,
  isUseEffect,
} from "./utils/effect/react.js";

// 1:1 port of upstream
// `eslint-plugin-react-you-might-not-need-an-effect/src/rules/no-derived-state.js`.
// Diagnostic messages match upstream verbatim. The ESLint scope APIs
// upstream uses (`context.sourceCode.getScope`, `ref.resolved.defs`)
// are sourced from a cached eslint-scope `ScopeManager` via
// `getProgramAnalysis(node)`.

const countSetterCallSites = (ref: Reference): number => {
  if (!ref.resolved) return 0;
  let count = 0;
  for (const reference of ref.resolved.references) {
    const parent = (reference.identifier as unknown as { parent?: EsTreeNode | null }).parent;
    if (parent && isNodeOfType(parent, "CallExpression")) count += 1;
  }
  return count;
};

const getStateNameForUseStateDecl = (useStateNode: EsTreeNode | null): string | null => {
  if (!useStateNode || !isNodeOfType(useStateNode, "VariableDeclarator")) return null;
  if (!isNodeOfType(useStateNode.id, "ArrayPattern")) return null;
  const elements = useStateNode.id.elements ?? [];
  const candidate = elements[0] ?? elements[1];
  if (!candidate) return null;
  return isNodeOfType(candidate, "Identifier") ? candidate.name : null;
};

export const noDerivedState = defineRule<Rule>({
  id: "no-derived-state",
  severity: "warn",
  tags: ["test-noise"],
  recommendation:
    "Compute derived state inline during render (or with useMemo if expensive) instead of mirroring it into useState via a useEffect. See https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state",
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNodeOfType<"CallExpression">) {
      if (!isUseEffect(node)) return;
      const analysis = getProgramAnalysis(node);
      if (!analysis) return;
      if (hasCleanup(analysis, node)) return;
      const effectFnRefs = getEffectFnRefs(analysis, node);
      const depsRefs = getEffectDepsRefs(analysis, node);
      if (!effectFnRefs || !depsRefs) return;
      const effectFn = getEffectFn(analysis, node);
      if (!effectFn) return;

      for (const ref of effectFnRefs) {
        if (!isStateSetterCall(analysis, ref)) continue;
        if (!isSynchronous(ref.identifier as unknown as EsTreeNode, effectFn)) continue;

        const callExpr = getCallExpr(ref);
        if (!callExpr) continue;
        const useStateNode = getUseStateDecl(analysis, ref);
        const stateName = getStateNameForUseStateDecl(useStateNode) ?? "<state>";

        const argsUpstreamRefs = getArgsUpstreamRefs(analysis, ref);
        const depsUpstreamRefs: Reference[] = depsRefs.flatMap((depRef) =>
          getUpstreamRefs(analysis, depRef),
        );

        // Initial-only / default / seed prop pattern. When every
        // upstream arg is a prop whose NAME signals init-only intent
        // (`initialValue`, `defaultX`, `seedY`, etc.), the consumer
        // is intentionally re-syncing on a controlled-init prop. This
        // is `useState(initialValue) + useEffect(...) ` to rebind on
        // explicit "reset" — skip.
        const allArgsAreInitialOnlyProps =
          argsUpstreamRefs.length > 0 &&
          argsUpstreamRefs.every((argRef) => isInitialOnlyPropRef(analysis, argRef));
        if (allArgsAreInitialOnlyProps) continue;

        const isSomeArgsInternal = argsUpstreamRefs.some(
          (argRef) => isState(analysis, argRef) || isProp(analysis, argRef),
        );

        const isAllArgsInDeps =
          argsUpstreamRefs.length > 0 &&
          argsUpstreamRefs.every((argRef) =>
            depsUpstreamRefs.some((depRef) => argRef.resolved === depRef.resolved),
          );
        const isValueAlwaysInSync = isAllArgsInDeps && countSetterCallSites(ref) === 1;

        if (isSomeArgsInternal) {
          context.report({
            node: callExpr,
            message: `Avoid storing derived state. Compute "${stateName}" directly during render, optionally with \`useMemo\` if it's expensive.`,
          });
        } else if (isValueAlwaysInSync) {
          context.report({
            node: callExpr,
            message: `Avoid storing derived state. "${stateName}" is only set here, and thus could be computed directly during render.`,
          });
        }
      }
    },
  }),
});

// True iff `ref` resolves to a prop whose NAME signals the consumer
// opted into the controlled-init pattern (`initialValue`,
// `defaultValue`, `seedColor`, `startingState`, `baselineX`,
// `presetTheme`). For these, sync-on-change via useEffect is the
// canonical "reset child state when caller passes a new initial" idiom
// and shouldn't be flagged.
const isInitialOnlyPropRef = (
  analysis: ReturnType<typeof getProgramAnalysis>,
  ref: Reference,
): boolean => {
  if (!analysis) return false;
  if (!isProp(analysis, ref)) return false;
  const id = ref.identifier as unknown as EsTreeNode | undefined;
  if (!id || !isNodeOfType(id, "Identifier")) return false;
  return isInitialOnlyPropName(id.name);
};

const isInitialOnlyPropName = (propName: string): boolean => {
  if (propName === "initialValue" || propName === "defaultValue" || propName === "seedValue") {
    return true;
  }
  return (
    /^initial[A-Z]/.test(propName) ||
    /^default[A-Z]/.test(propName) ||
    /^seed[A-Z]/.test(propName) ||
    /^starting[A-Z]/.test(propName) ||
    /^baseline[A-Z]/.test(propName) ||
    /^preset[A-Z]/.test(propName)
  );
};
