import { defineRule } from "../../utils/define-rule.js";
import type { EsTreeNode } from "../../utils/es-tree-node.js";
import type { EsTreeNodeOfType } from "../../utils/es-tree-node-of-type.js";
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
  findContainingNode,
  getEffectFn,
  getEffectFnRefs,
  hasCleanup,
  isConstant,
  isCustomHook,
  isProp,
  isPropCall,
  isRefCall,
  isRefCurrent,
  isUseEffect,
} from "./utils/effect/react.js";
import { isNodeOfType } from "../../utils/is-node-of-type.js";

// 1:1 port of upstream `src/rules/no-pass-data-to-parent.js`.

// Method names that are clearly NOT "callbacks that pass data to a
// parent" even when called on a prop value — JS prototype iterators,
// observer-pattern subscriptions, promise chaining, native Set/Map/
// EventEmitter methods. The rule's intent is to catch
// `props.onDataLoaded(data)` style callbacks; `props.items.forEach(fn)`,
// `props.store.subscribe(fn)`, `props.fetcher.then(fn)` aren't that.
const ITERATOR_METHOD_NAMES: ReadonlySet<string> = new Set([
  // Array.prototype iterators
  "forEach",
  "map",
  "filter",
  "reduce",
  "reduceRight",
  "flatMap",
  "some",
  "every",
  "find",
  "findIndex",
  "findLast",
  "findLastIndex",
  // Observer / EventEmitter / event bus patterns — these are
  // hand-off calls (the consumer keeps a subscription / dispatches
  // to subscribers) not the "pass derived data to a parent"
  // anti-pattern the rule targets.
  "subscribe",
  "unsubscribe",
  "addEventListener",
  "addListener",
  "removeEventListener",
  "removeListener",
  "on",
  "once",
  "off",
  "emit",
  "dispatch",
  "publish",
  "notify",
  "trigger",
  "fire",
  "broadcast",
  "send",
  // Promise
  "then",
  "catch",
  "finally",
  // Set / Map / cache
  "add",
  "delete",
  "has",
  "get",
  "set",
  "clear",
  "put",
  "push",
  "pop",
  "shift",
  "unshift",
  // Logger / telemetry shapes — `props.logger.info(...)` is reporting,
  // not data hand-off.
  "log",
  "info",
  "warn",
  "error",
  "debug",
  "trace",
  "track",
  "capture",
  // Imperative action methods on stateful objects — `animationLoop.start()`,
  // `subscription.cancel()`, `controller.abort()`. The arg (if any) is
  // a configuration value, not the child's derived state.
  "start",
  "stop",
  "play",
  "pause",
  "resume",
  "cancel",
  "abort",
  "commit",
  "rollback",
  "reset",
  "focus",
  "blur",
  "scroll",
  "scrollTo",
  "scrollIntoView",
  "close",
  "open",
  "show",
  "hide",
  "expand",
  "collapse",
  "toggle",
  "refresh",
  "reload",
  "rerender",
  "refetch",
  "invalidate",
  "select",
  "deselect",
  "click",
  "press",
  "tap",
  "submit",
  "validate",
  "format",
  "parse",
  "serialize",
  "deserialize",
]);

const getCallMethodName = (callee: EsTreeNode): string | null => {
  if (
    isNodeOfType(callee, "MemberExpression") &&
    !callee.computed &&
    isNodeOfType(callee.property, "Identifier")
  ) {
    return callee.property.name;
  }
  return null;
};

// Intermediate property names in a member-expression chain that mark
// the callee as a method on a namespaced API object rather than a
// parent callback prop. `editor.commands.setSelection(...)` is calling
// an imperative editor command, NOT handing data back to a parent.
// Same for `props.store.dispatch(...)`, `props.api.refresh(...)`,
// `props.client.invalidate(...)`, etc.
const NAMESPACED_API_PROPERTY_NAMES: ReadonlySet<string> = new Set([
  "commands",
  "actions",
  "api",
  "store",
  "service",
  "client",
  "controller",
  "manager",
  "registry",
  "dispatch",
  "queryClient",
  "fetcher",
  "loader",
  "editor",
  "model",
  "context",
  "transport",
  "channel",
  "session",
  "connection",
  "instance",
  "ref",
  "current",
  "value",
  "state",
  "vm",
  "viewModel",
  "logic",
  "selectors",
  "queries",
  "mutations",
  "effects",
  "utils",
  "helpers",
  "lib",
  // Domain-grouped APIs commonly exposed on editor / app / sdk objects.
  // `editor.fonts.X`, `editor.shapes.X`, `app.users.X`, `posthog.events.X`,
  // `analytics.events.X`, `webhooks.X`, etc. — these are namespaced
  // method groups, not parent callbacks.
  "fonts",
  "shapes",
  "nodes",
  "layers",
  "users",
  "accounts",
  "events",
  "logs",
  "metrics",
  "telemetry",
  "tracker",
  "tracking",
  "analytics",
  "posthog",
  "sentry",
  "auth",
  "session",
  "permissions",
  "roles",
  "features",
  "flags",
  "config",
  "settings",
  "preferences",
  "storage",
  "cache",
  "history",
  "navigation",
  "router",
  "navigator",
  "scheduler",
  "queue",
  "pipeline",
  "stream",
  "socket",
  "bridge",
  "io",
  "fs",
  "db",
  "kv",
  "blob",
  "buffer",
  "cells",
  "rows",
  "columns",
  "tabs",
  "panels",
  "windows",
  "elements",
  "selections",
  "selection",
  "clipboard",
  "viewport",
  "camera",
  "scene",
  "world",
  "physics",
  "renderer",
  "renderers",
  "rendering",
  "pipeline",
  "ports",
  "messages",
  "channels",
  "subscriptions",
  "observers",
  "watchers",
  "listeners",
  "handlers",
]);

// Walks `props.X.commands.setY(...)` style chains looking for an
// intermediate property whose name is in NAMESPACED_API_PROPERTY_NAMES.
// If found, this is a namespace-method call, not a parent-callback
// data hand-back.
const callIsThroughNamespacedApi = (callee: EsTreeNode): boolean => {
  let cursor: EsTreeNode | null | undefined = callee;
  let hops = 0;
  while (cursor && hops < 16) {
    hops += 1;
    if (!isNodeOfType(cursor, "MemberExpression")) return false;
    // Walk left, but check intermediate property names.
    if (!cursor.computed && isNodeOfType(cursor.property, "Identifier")) {
      const name = cursor.property.name;
      if (NAMESPACED_API_PROPERTY_NAMES.has(name)) return true;
    }
    cursor = cursor.object;
  }
  return false;
};

// Local mirror of upstream's inline `isUseState`/`isUseRef` checks
// that work on the *identifier* of an upstream ref (not on a ref).
const isUseStateIdentifier = (identifier: EsTreeNode): boolean => {
  if (!isNodeOfType(identifier, "Identifier")) return false;
  if (identifier.name === "useState") return true;
  const parent = (identifier as unknown as { parent?: EsTreeNode | null }).parent;
  if (
    parent &&
    isNodeOfType(parent, "MemberExpression") &&
    isNodeOfType(parent.object, "Identifier") &&
    parent.object.name === "React" &&
    isNodeOfType(parent.property, "Identifier") &&
    parent.property.name === "useState"
  ) {
    return true;
  }
  return false;
};

const isUseRefIdentifier = (identifier: EsTreeNode): boolean => {
  if (!isNodeOfType(identifier, "Identifier")) return false;
  if (identifier.name === "useRef") return true;
  const parent = (identifier as unknown as { parent?: EsTreeNode | null }).parent;
  if (
    parent &&
    isNodeOfType(parent, "MemberExpression") &&
    isNodeOfType(parent.object, "Identifier") &&
    parent.object.name === "React" &&
    isNodeOfType(parent.property, "Identifier") &&
    parent.property.name === "useRef"
  ) {
    return true;
  }
  return false;
};

export const noPassDataToParent = defineRule<Rule>({
  id: "no-pass-data-to-parent",
  severity: "warn",
  tags: ["test-noise"],
  recommendation:
    "Fetch the data in the parent and pass it to the child as a prop (or return it from the hook), instead of pushing it back up via a prop callback inside a useEffect. See https://react.dev/learn/you-might-not-need-an-effect#passing-data-to-the-parent",
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNodeOfType<"CallExpression">) {
      if (!isUseEffect(node)) return;
      const analysis = getProgramAnalysis(node);
      if (!analysis) return;
      if (hasCleanup(analysis, node)) return;
      const effectFnRefs = getEffectFnRefs(analysis, node);
      if (!effectFnRefs) return;
      const effectFn = getEffectFn(analysis, node);
      if (!effectFn) return;

      for (const ref of effectFnRefs) {
        if (!isPropCall(analysis, ref)) continue;
        if (isRefCall(analysis, ref)) continue;
        if (!isSynchronous(ref.identifier as unknown as EsTreeNode, effectFn)) continue;
        const callExpr = getCallExpr(ref);
        if (!callExpr) continue;

        // Skip well-known prototype/observer/promise methods —
        // `props.items.forEach(fn)`, `props.store.subscribe(fn)`,
        // `props.fetcher.then(fn)` are NOT "passing data to a parent
        // via a callback", they're iteration / subscription /
        // chaining patterns that happen to receive a callback. The
        // rule's intent is `props.onDataLoaded(data)` style hand-back,
        // which never uses these method names.
        const calleeNode = (callExpr as unknown as { callee?: EsTreeNode }).callee;
        const methodName = calleeNode ? getCallMethodName(calleeNode) : null;
        if (methodName && ITERATOR_METHOD_NAMES.has(methodName)) continue;
        // `editor.commands.setSelection(...)`, `props.store.dispatch(...)`,
        // `props.queryClient.invalidate(...)` etc. — calling a method
        // on a namespaced API object, not handing data back to a parent.
        if (calleeNode && callIsThroughNamespacedApi(calleeNode)) continue;

        const argsUpstreamRefs = getArgsUpstreamRefs(analysis, ref).filter(
          (argRef) => getUpstreamRefs(analysis, argRef).length === 1,
        );

        const isSomeArgsData = argsUpstreamRefs.some((argRef) => {
          if (isUseStateIdentifier(argRef.identifier as unknown as EsTreeNode)) return false;
          if (isProp(analysis, argRef)) return false;
          if (isUseRefIdentifier(argRef.identifier as unknown as EsTreeNode)) return false;
          if (isRefCurrent(argRef)) return false;
          if (isConstant(argRef)) return false;
          return true;
        });
        if (!isSomeArgsData) continue;

        const containing = findContainingNode(analysis, node);
        const isInCustomHook = containing != null && isCustomHook(containing);
        context.report({
          node: callExpr,
          message: isInCustomHook
            ? "Avoid passing data to parents in an effect. Instead, return the data from the hook."
            : "Avoid passing data to parents in an effect. Instead, fetch the data in the parent and pass it down to the child as a prop.",
        });
      }
    },
  }),
});
