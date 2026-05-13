import {
  CLEANUP_LIKE_RELEASE_CALLEE_NAMES,
  EFFECT_HOOK_NAMES,
  SUBSCRIPTION_METHOD_NAMES,
  TIMER_CALLEE_NAMES_REQUIRING_CLEANUP,
  TIMER_CLEANUP_CALLEE_NAMES,
  UNSUBSCRIPTION_METHOD_NAMES,
} from "../../constants.js";
import {
  defineRule,
  getEffectCallback,
  isHookCall,
  walkAst,
  walkInsideStatementBlocks,
} from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

// HACK: From "Lifecycle of Reactive Effects":
//
//   "Each Effect describes a separate synchronization process. When
//    the component is removed, your Effect needs to stop synchronizing.
//    The cleanup function should stop or undo whatever the Effect was
//    doing."
//
// An effect that adds a listener / subscribes / sets a timer but
// returns no cleanup leaks memory and triggers React's "you forgot
// to clean up an effect" StrictMode hint at runtime. We flag it
// statically. Three subscribe-shaped families:
//   - addEventListener (browser DOM, EventTarget-shaped libs)
//   - subscribe / addListener / on / watch / listen / sub
//   - setInterval / setTimeout (without explicit clear)
//
// The subscribe / unsubscribe method allowlists live in `constants.ts`
// (`SUBSCRIPTION_METHOD_NAMES`, `UNSUBSCRIPTION_METHOD_NAMES`) so the
// cleanup-needed detector and the prefer-use-sync-external-store
// detector share a single source of truth. Inline duplicates would
// silently drift out of sync as new library shapes get added.
interface SubscribeLikeUsage {
  kind: "subscribe" | "timer";
  resourceName: string;
}

const findSubscribeLikeUsages = (callback: EsTreeNode): SubscribeLikeUsage[] => {
  const usages: SubscribeLikeUsage[] = [];
  // HACK: timer/subscribe calls inside the EFFECT'S CLEANUP RETURN
  // are not new registrations — they're the disposal step. The old
  // walker traversed the full callback including any returned
  // cleanup function, so a `setTimeout` inside `return () => { ... }`
  // got counted as a usage. Detect and skip the cleanup ReturnStatement's
  // argument body during the walk.
  let cleanupArgument: EsTreeNode | null = null;
  if (callback.body?.type === "BlockStatement") {
    const callbackStatements = callback.body.body ?? [];
    const lastCallbackStatement = callbackStatements[callbackStatements.length - 1];
    if (lastCallbackStatement?.type === "ReturnStatement" && lastCallbackStatement.argument) {
      cleanupArgument = lastCallbackStatement.argument;
    }
  }

  walkAst(callback, (child: EsTreeNode) => {
    if (child === cleanupArgument) return false;
    if (child.type !== "CallExpression") return;

    if (
      child.callee?.type === "Identifier" &&
      TIMER_CALLEE_NAMES_REQUIRING_CLEANUP.has(child.callee.name)
    ) {
      usages.push({
        kind: "timer",
        resourceName: child.callee.name,
      });
      return;
    }

    if (
      child.callee?.type === "MemberExpression" &&
      child.callee.property?.type === "Identifier" &&
      SUBSCRIPTION_METHOD_NAMES.has(child.callee.property.name)
    ) {
      usages.push({
        kind: "subscribe",
        resourceName: child.callee.property.name,
      });
    }
  });
  return usages;
};

const isSubscribeLikeCallExpression = (node: EsTreeNode): boolean => {
  if (node?.type !== "CallExpression") return false;
  if (node.callee?.type !== "MemberExpression") return false;
  if (node.callee.property?.type !== "Identifier") return false;
  return SUBSCRIPTION_METHOD_NAMES.has(node.callee.property.name);
};

// HACK: variables bound to a subscribe-like or timer-like call inside
// an effect body are CLEANUP TARGETS — `return X` or `() => X()` /
// `() => clearTimeout(X)` releases the resource. Collecting them here
// lets the shared release predicate accept user-named bindings
// (`const unsub = ...; return unsub`) without falling back to the
// previous "any Identifier is fine" behavior.
const collectReleasableBindingNames = (effectCallback: EsTreeNode): Set<string> => {
  const releasableNames = new Set<string>();
  if (effectCallback.body?.type !== "BlockStatement") return releasableNames;
  for (const statement of effectCallback.body.body ?? []) {
    if (statement.type !== "VariableDeclaration") continue;
    for (const declarator of statement.declarations ?? []) {
      if (declarator.id?.type !== "Identifier") continue;
      const init = declarator.init;
      if (!init || init.type !== "CallExpression") continue;
      if (isSubscribeLikeCallExpression(init)) {
        releasableNames.add(declarator.id.name);
        continue;
      }
      if (
        init.callee?.type === "Identifier" &&
        TIMER_CALLEE_NAMES_REQUIRING_CLEANUP.has(init.callee.name)
      ) {
        releasableNames.add(declarator.id.name);
      }
    }
  }
  return releasableNames;
};

// Single source of truth for "does this CallExpression release a
// previously-acquired effect resource?". Used by both
// `effectNeedsCleanup` and `prefer-use-sync-external-store` so the
// two rules can never disagree on what a cleanup looks like.
const isReleaseLikeCall = (
  callNode: EsTreeNode,
  knownBoundReleaseNames: ReadonlySet<string>,
): boolean => {
  if (callNode?.type !== "CallExpression") return false;
  const callee = callNode.callee;
  if (callee?.type === "Identifier") {
    if (TIMER_CLEANUP_CALLEE_NAMES.has(callee.name)) return true;
    if (CLEANUP_LIKE_RELEASE_CALLEE_NAMES.has(callee.name)) return true;
    if (knownBoundReleaseNames.has(callee.name)) return true;
    return false;
  }
  if (callee?.type === "MemberExpression" && callee.property?.type === "Identifier") {
    return UNSUBSCRIPTION_METHOD_NAMES.has(callee.property.name);
  }
  return false;
};

const containsReleaseLikeCall = (
  node: EsTreeNode,
  knownBoundReleaseNames: ReadonlySet<string>,
): boolean => {
  let didFindRelease = false;
  walkAst(node, (child: EsTreeNode) => {
    if (didFindRelease) return false;
    if (isReleaseLikeCall(child, knownBoundReleaseNames)) {
      didFindRelease = true;
      return false;
    }
  });
  return didFindRelease;
};

// Recognizes the four cleanup-return shapes uniformly:
//   return unsub                              → bound name match
//   return store.subscribe(handler)           → subscribe call IS the unsub
//   return () => unsub()                      → closure releases via name
//   return () => store.removeListener(...)    → closure releases via verb
const isCleanupReturn = (
  returnedValue: EsTreeNode | null | undefined,
  knownBoundReleaseNames: ReadonlySet<string>,
): boolean => {
  if (!returnedValue) return false;
  if (returnedValue.type === "Identifier") {
    return knownBoundReleaseNames.has(returnedValue.name);
  }
  if (isSubscribeLikeCallExpression(returnedValue)) return true;
  if (
    returnedValue.type === "ArrowFunctionExpression" ||
    returnedValue.type === "FunctionExpression"
  ) {
    return containsReleaseLikeCall(returnedValue, knownBoundReleaseNames);
  }
  return false;
};

const effectHasCleanupRelease = (callback: EsTreeNode): boolean => {
  // HACK: expression-body arrows are the dominant shape for trivial
  // subscribe-only effects:
  //
  //   useEffect(() => store.subscribe(handler), []);
  //
  // The arrow's expression body IS the body, and its evaluation
  // result is implicitly returned as the effect's cleanup function.
  // For subscribe-shaped calls we know the return value is the
  // unsubscribe — accept this case before the BlockStatement-only
  // checks below.
  if (callback.body?.type !== "BlockStatement") {
    return isSubscribeLikeCallExpression(callback.body);
  }
  const knownBoundReleaseNames = collectReleasableBindingNames(callback);
  // HACK: scan ALL `return` statements at the effect's own function
  // scope (skipping nested functions via `walkInsideStatementBlocks`),
  // not just the top-level last statement. The last-statement check
  // false-positives on the very common conditional-cleanup shape:
  //
  //   useEffect(() => {
  //     if (!enabled) return;
  //     const sub = subscribe(...);
  //     if (someCondition) {
  //       return () => sub();
  //     }
  //   }, [enabled]);
  //
  // Either accept the conditional cleanup as intentional, or risk
  // ~36% FPs on real codebases (measured: react-grab, excalidraw,
  // textarea/popover patterns). Accepting nested cleanup mirrors how
  // exhaustive-deps treats branched returns: trust the author.
  let didFindCleanupReturn = false;
  walkInsideStatementBlocks(callback.body, (child: EsTreeNode) => {
    if (didFindCleanupReturn) return;
    if (child.type !== "ReturnStatement") return;
    if (isCleanupReturn(child.argument, knownBoundReleaseNames)) {
      didFindCleanupReturn = true;
    }
  });
  return didFindCleanupReturn;
};

export const effectNeedsCleanup = defineRule<Rule>({
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isHookCall(node, EFFECT_HOOK_NAMES)) return;
      const callback = getEffectCallback(node);
      if (!callback) return;

      const usages = findSubscribeLikeUsages(callback);
      if (usages.length === 0) return;

      if (effectHasCleanupRelease(callback)) return;

      const firstUsage = usages[0];
      const verb = firstUsage.kind === "timer" ? "schedules" : "subscribes via";
      const release =
        firstUsage.kind === "timer"
          ? `clear${firstUsage.resourceName === "setInterval" ? "Interval" : "Timeout"}(...)`
          : "the matching remove/unsubscribe call";
      context.report({
        node,
        message: `useEffect ${verb} \`${firstUsage.resourceName}(...)\` but never returns a cleanup — leaks the registration on every re-run and on unmount. Return a cleanup function that calls ${release}`,
      });
    },
  }),
});
