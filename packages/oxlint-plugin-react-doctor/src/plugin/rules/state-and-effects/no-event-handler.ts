import { defineRule } from "../../utils/define-rule.js";
import type { EsTreeNode } from "../../utils/es-tree-node.js";
import type { EsTreeNodeOfType } from "../../utils/es-tree-node-of-type.js";
import { isNodeOfType } from "../../utils/is-node-of-type.js";
import type { Rule } from "../../utils/rule.js";
import type { RuleContext } from "../../utils/rule-context.js";
import { findDownstreamNodes, getDownstreamRefs, getUpstreamRefs } from "./utils/effect/ast.js";
import { getProgramAnalysis } from "./utils/effect/get-program-analysis.js";
import { getEffectFnRefs, hasCleanup, isProp, isState, isUseEffect } from "./utils/effect/react.js";

// Early-exit guards inside useEffect are the standard React idiom for
// gating an effect: `if (!enabled) return;`. They're NOT
// "event-handler-in-disguise" antipatterns — the body doesn't run any
// side effect when the guard trips. Treat any `if` whose consequent is a
// pure early return / break / continue (with no side effect downstream)
// as not-an-event-handler. Also accepts the reset-then-exit shape
// (`setX(default); return;`) — the effect is bailing out and the
// setter is just clearing derived state before bail, NOT
// event-handler-like behaviour.
const SETTER_NAME_PATTERN = /^set[A-Z]/;

const isSetterCallExpressionStatement = (node: EsTreeNode): boolean => {
  if (!isNodeOfType(node, "ExpressionStatement")) return false;
  let expression = node.expression as EsTreeNode | null;
  // `setX?.(value)` ChainExpression — unwrap.
  if (expression && isNodeOfType(expression, "ChainExpression")) {
    expression = expression.expression as EsTreeNode;
  }
  if (!expression) return false;
  if (isNodeOfType(expression, "CallExpression")) {
    const callee = expression.callee;
    if (isNodeOfType(callee, "Identifier")) {
      return SETTER_NAME_PATTERN.test(callee.name);
    }
    // `props.onChange(value)` — looks like a prop callback. Treat as
    // setter-like (it's a write call, not an event-handler trigger).
    if (
      isNodeOfType(callee, "MemberExpression") &&
      isNodeOfType(callee.property, "Identifier") &&
      SETTER_NAME_PATTERN.test(callee.property.name)
    ) {
      return true;
    }
    return false;
  }
  // `xxxRef.current = value` — ref mutation. Refs aren't React state,
  // so assigning to them inside an effect is bookkeeping (one-shot
  // marker, abort signal, scroll position cache), NOT event-handler-
  // like behaviour. Common idiom:
  //   if (!isEditing) { promptOpen.current = false; return }
  if (isNodeOfType(expression, "AssignmentExpression")) {
    const left = expression.left;
    if (
      isNodeOfType(left, "MemberExpression") &&
      !left.computed &&
      isNodeOfType(left.property, "Identifier") &&
      left.property.name === "current" &&
      isNodeOfType(left.object, "Identifier")
    ) {
      return true;
    }
  }
  return false;
};

// `xxxRef.current` — ref read. When an IF test contains a ref guard
// (`if (wrapperRef.current !== null && X && !hydratedRef.current)`),
// the effect is a one-shot hydration / lazy-mount / scroll-restore
// pattern, not an event-handler-in-disguise. The ref check is the
// "have we run this once yet" guard.
const containsRefGuard = (testNode: EsTreeNode): boolean => {
  // Walk the AST under testNode for any `X.current` MemberExpression.
  const stack: EsTreeNode[] = [testNode];
  let depth = 0;
  while (stack.length > 0 && depth < 50) {
    depth += 1;
    const node = stack.pop()!;
    if (
      isNodeOfType(node, "MemberExpression") &&
      !node.computed &&
      isNodeOfType(node.property, "Identifier") &&
      node.property.name === "current" &&
      isNodeOfType(node.object, "Identifier")
    ) {
      const name = node.object.name;
      // Heuristic: identifier ends with "Ref" or is literally "ref" /
      // "ref<N>" — common React/Vue ref naming.
      if (name === "ref" || name.endsWith("Ref") || name.endsWith("ref")) {
        return true;
      }
    }
    // Recurse — limit to common compound expression types so we don't
    // wander into nested arrow functions, etc.
    if (isNodeOfType(node, "LogicalExpression")) {
      stack.push(node.left as EsTreeNode, node.right as EsTreeNode);
    } else if (isNodeOfType(node, "BinaryExpression")) {
      stack.push(node.left as EsTreeNode, node.right as EsTreeNode);
    } else if (isNodeOfType(node, "UnaryExpression")) {
      stack.push(node.argument as EsTreeNode);
    } else if (isNodeOfType(node, "ConditionalExpression")) {
      stack.push(
        node.test as EsTreeNode,
        node.consequent as EsTreeNode,
        node.alternate as EsTreeNode,
      );
    } else if (isNodeOfType(node, "MemberExpression")) {
      stack.push(node.object as EsTreeNode);
    } else if (isNodeOfType(node, "ChainExpression")) {
      stack.push(node.expression as EsTreeNode);
    } else if (isNodeOfType(node, "ParenthesizedExpression")) {
      stack.push((node as { expression: EsTreeNode }).expression);
    }
  }
  return false;
};

const isPureEarlyExitConsequent = (consequent: EsTreeNode): boolean => {
  // `if (cond) return;` / `if (cond) return value;`
  if (isNodeOfType(consequent, "ReturnStatement")) return true;
  if (isNodeOfType(consequent, "ContinueStatement")) return true;
  if (isNodeOfType(consequent, "BreakStatement")) return true;
  // `if (cond) { return; }` — block with early-exit at the end and
  // (optionally) a contiguous run of setter calls before it.
  if (isNodeOfType(consequent, "BlockStatement")) {
    const body = consequent.body ?? [];
    if (body.length === 0) return true;
    const last = body[body.length - 1] as EsTreeNode;
    const lastIsExit =
      isNodeOfType(last, "ReturnStatement") ||
      isNodeOfType(last, "ContinueStatement") ||
      isNodeOfType(last, "BreakStatement");
    if (!lastIsExit) return false;
    // Allow any number of setter-only preamble statements:
    //   if (!enabled) { setLocal(initial); setLoading(false); return; }
    for (let i = 0; i < body.length - 1; i++) {
      if (!isSetterCallExpressionStatement(body[i] as EsTreeNode)) return false;
    }
    return true;
  }
  return false;
};

// 1:1 port of upstream `src/rules/no-event-handler.js`, narrowed to skip
// pure early-exit guard patterns (`if (!enabled) return;`) which are the
// canonical React idiom for gating an effect, not an event-handler
// antipattern.
export const noEventHandler = defineRule<Rule>({
  id: "no-event-handler",
  tags: ["test-noise"],
  severity: "warn",
  recommendation:
    "Move the side effect into the event handler that triggers it, instead of guarding on its state inside a useEffect. See https://react.dev/learn/you-might-not-need-an-effect#sharing-logic-between-event-handlers",
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNodeOfType<"CallExpression">) {
      if (!isUseEffect(node)) return;
      const analysis = getProgramAnalysis(node);
      if (!analysis) return;
      if (hasCleanup(analysis, node)) return;
      const effectFnRefs = getEffectFnRefs(analysis, node);
      if (!effectFnRefs) return;

      const ifStatementsNoElse = findDownstreamNodes(node, "IfStatement").filter(
        (ifNode) =>
          isNodeOfType(ifNode, "IfStatement") &&
          !ifNode.alternate &&
          !isPureEarlyExitConsequent(ifNode.consequent as EsTreeNode) &&
          // Ref-guard IF tests (`if (wrapperRef.current !== null && X
          // && !hydratedRef.current)`) are one-shot hydration / lazy-
          // mount / scroll-restore patterns, not event-handler logic.
          !containsRefGuard(ifNode.test as EsTreeNode),
      );
      const ifTestRefs = ifStatementsNoElse.flatMap((ifNode) => {
        if (!isNodeOfType(ifNode, "IfStatement")) return [];
        return getDownstreamRefs(analysis, ifNode.test as EsTreeNode).flatMap((ref) =>
          getUpstreamRefs(analysis, ref),
        );
      });

      // Dedupe by RESOLVED BINDING (not by identifier identity) —
      // `getUpstreamRefs` returns every reference to the same
      // binding (including unrelated call sites and the destructure
      // location), and each reference has a different identifier
      // node. Without binding-level dedupe, a single useEffect use
      // of a prop emits one diagnostic at every other reference to
      // that prop in the file.
      const seenBindings = new Set<unknown>();
      const seenIdentifiers = new Set<EsTreeNode>();
      const dedupedRefs = ifTestRefs.filter((ref) => {
        const identifier = ref.identifier as unknown as EsTreeNode;
        if (!identifier) return false;
        const resolved = (ref as unknown as { resolved?: unknown }).resolved;
        if (resolved && seenBindings.has(resolved)) return false;
        if (resolved) seenBindings.add(resolved);
        if (seenIdentifiers.has(identifier)) return false;
        seenIdentifiers.add(identifier);
        return true;
      });

      for (const ref of dedupedRefs) {
        if (isState(analysis, ref)) {
          context.report({
            node: ref.identifier as unknown as EsTreeNode,
            message:
              "Avoid using state and effects as an event handler. Instead, call the event handling code directly when the event occurs.",
          });
        }
      }
      for (const ref of dedupedRefs) {
        if (isProp(analysis, ref)) {
          context.report({
            node: ref.identifier as unknown as EsTreeNode,
            message:
              "Avoid using props and effects as an event handler. Instead, move the handler to the parent component.",
          });
        }
      }
    },
  }),
});
