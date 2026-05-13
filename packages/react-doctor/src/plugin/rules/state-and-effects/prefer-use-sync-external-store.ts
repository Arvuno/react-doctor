import {
  CLEANUP_LIKE_RELEASE_CALLEE_NAMES,
  EFFECT_HOOK_NAMES,
  SUBSCRIPTION_METHOD_NAMES,
  TIMER_CLEANUP_CALLEE_NAMES,
  UNSUBSCRIPTION_METHOD_NAMES,
} from "../../constants.js";
import {
  areExpressionsStructurallyEqual,
  defineRule,
  getCallbackStatements,
  getEffectCallback,
  isComponentAssignment,
  isHookCall,
  isSetterIdentifier,
  isUppercaseName,
  walkAst,
} from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

// HACK: a useState whose value is never read in the component's JSX
// return is by definition not visual state — every setState triggers a
// render that produces the same DOM. Use `useRef` (`ref.current = ...`)
// so updates don't trigger re-renders. (For values read inside an
// addEventListener-style callback, a ref also lets the handler always
// see the latest value without re-subscribing each effect run.)
const collectUseStateBindings = (
  componentBody: EsTreeNode,
): Array<{ valueName: string; setterName: string; declarator: EsTreeNode }> => {
  const bindings: Array<{ valueName: string; setterName: string; declarator: EsTreeNode }> = [];
  if (componentBody?.type !== "BlockStatement") return bindings;

  for (const statement of componentBody.body ?? []) {
    if (statement.type !== "VariableDeclaration") continue;
    for (const declarator of statement.declarations ?? []) {
      if (declarator.id?.type !== "ArrayPattern") continue;
      const elements = declarator.id.elements ?? [];
      if (elements.length < 2) continue;
      const valueElement = elements[0];
      const setterElement = elements[1];
      if (
        valueElement?.type !== "Identifier" ||
        setterElement?.type !== "Identifier" ||
        !isSetterIdentifier(setterElement.name)
      ) {
        continue;
      }
      if (declarator.init?.type !== "CallExpression") continue;
      if (!isHookCall(declarator.init, "useState")) continue;
      bindings.push({
        valueName: valueElement.name,
        setterName: setterElement.name,
        declarator,
      });
    }
  }
  return bindings;
};

// HACK: §11 of "You Might Not Need an Effect" + the linked
// `useSyncExternalStore` docs warn that pairing a `useState(getSnapshot())`
// with a `useEffect(() => store.subscribe(() => setSnapshot(getSnapshot())))`
// reimplements `useSyncExternalStore` in user space — incorrectly.
// The hand-rolled version doesn't support concurrent rendering,
// allows tearing during transitions, and lacks server-snapshot
// support during hydration.
//
// We require a four-vertex AST match before reporting:
//
//   (1) useEffect with empty deps                   `[]`
//   (2) body declares `const u = X.subscribe(handler)` OR
//       directly invokes a subscription method      X.addEventListener(...)
//   (3) cleanup is a `return` that either returns the unsubscribe
//       binding directly OR returns a closure that unsubscribes
//   (4) handler is a single `setY(<getter>)` whose `<getter>`
//       is structurally equal to the matching useState's initializer
//
// The combined match is so specific that real-world false positives
// are essentially impossible.
const findUseEffectsInComponent = (componentBody: EsTreeNode | undefined): EsTreeNode[] => {
  const effectCalls: EsTreeNode[] = [];
  if (componentBody?.type !== "BlockStatement") return effectCalls;
  for (const statement of componentBody.body ?? []) {
    walkAst(statement, (child: EsTreeNode) => {
      if (child.type === "CallExpression" && isHookCall(child, EFFECT_HOOK_NAMES)) {
        effectCalls.push(child);
      }
    });
  }
  return effectCalls;
};

const findSubscriptionCall = (
  effectBodyStatements: EsTreeNode[],
): { call: EsTreeNode; boundUnsubscribeName: string | null } | null => {
  for (const statement of effectBodyStatements) {
    if (statement.type === "VariableDeclaration") {
      for (const declarator of statement.declarations ?? []) {
        const init = declarator.init;
        if (init?.type !== "CallExpression") continue;
        if (init.callee?.type !== "MemberExpression") continue;
        if (init.callee.property?.type !== "Identifier") continue;
        if (!SUBSCRIPTION_METHOD_NAMES.has(init.callee.property.name)) continue;
        const boundUnsubscribeName =
          declarator.id?.type === "Identifier" ? declarator.id.name : null;
        return { call: init, boundUnsubscribeName };
      }
    }
    if (statement.type === "ExpressionStatement") {
      const expression = statement.expression;
      if (expression?.type !== "CallExpression") continue;
      if (expression.callee?.type !== "MemberExpression") continue;
      if (expression.callee.property?.type !== "Identifier") continue;
      if (!SUBSCRIPTION_METHOD_NAMES.has(expression.callee.property.name)) continue;
      return { call: expression, boundUnsubscribeName: null };
    }
  }
  return null;
};

// HACK: `window.addEventListener("online", onChange)` is the dominant
// real-world shape — the handler is declared as a separate `const` in
// the effect body so it can be shared with `removeEventListener` in the
// cleanup. We have to resolve the Identifier argument back to its
// locally-declared arrow/function init before the structural setter
// check can run.
const getSubscriptionHandlerArgument = (
  subscribeCall: EsTreeNode,
  effectBodyStatements: EsTreeNode[],
): EsTreeNode | null => {
  for (const argument of subscribeCall.arguments ?? []) {
    if (argument.type === "ArrowFunctionExpression" || argument.type === "FunctionExpression") {
      return argument;
    }
    if (argument.type === "Identifier") {
      for (const statement of effectBodyStatements) {
        if (statement.type !== "VariableDeclaration") continue;
        for (const declarator of statement.declarations ?? []) {
          if (declarator.id?.type !== "Identifier") continue;
          if (declarator.id.name !== argument.name) continue;
          const init = declarator.init;
          if (init?.type === "ArrowFunctionExpression" || init?.type === "FunctionExpression") {
            return init;
          }
        }
      }
    }
  }
  return null;
};

const getSingleSetterCallFromHandler = (
  handler: EsTreeNode,
): { setterName: string; setterArgument: EsTreeNode } | null => {
  const handlerStatements = getCallbackStatements(handler);
  if (handlerStatements.length !== 1) return null;
  const onlyStatement = handlerStatements[0];
  const expression =
    onlyStatement.type === "ExpressionStatement" ? onlyStatement.expression : onlyStatement;
  if (expression?.type !== "CallExpression") return null;
  if (expression.callee?.type !== "Identifier") return null;
  if (!isSetterIdentifier(expression.callee.name)) return null;
  if (!expression.arguments?.length) return null;
  return {
    setterName: expression.callee.name,
    setterArgument: expression.arguments[0],
  };
};

const isSubscribeLikeCallExpression = (node: EsTreeNode): boolean => {
  if (node?.type !== "CallExpression") return false;
  if (node.callee?.type !== "MemberExpression") return false;
  if (node.callee.property?.type !== "Identifier") return false;
  return SUBSCRIPTION_METHOD_NAMES.has(node.callee.property.name);
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

const cleanupReleasesSubscription = (
  effectBodyStatements: EsTreeNode[],
  boundUnsubscribeName: string | null,
): boolean => {
  const lastStatement = effectBodyStatements[effectBodyStatements.length - 1];
  if (lastStatement?.type !== "ReturnStatement") return false;
  const knownBoundReleaseNames = new Set<string>();
  if (boundUnsubscribeName) knownBoundReleaseNames.add(boundUnsubscribeName);
  return isCleanupReturn(lastStatement.argument, knownBoundReleaseNames);
};

export const preferUseSyncExternalStore = defineRule<Rule>({
  create: (context: RuleContext) => {
    const checkComponent = (componentBody: EsTreeNode | null | undefined): void => {
      if (!componentBody || componentBody.type !== "BlockStatement") return;

      const useStateBindings = collectUseStateBindings(componentBody);
      if (useStateBindings.length === 0) return;

      const useStateInitializerByValueName = new Map<string, EsTreeNode>();
      for (const binding of useStateBindings) {
        const useStateCall = binding.declarator.init;
        const initializerArgument = useStateCall?.arguments?.[0];
        if (!initializerArgument) continue;
        // HACK: useState(() => getSnapshot()) — unwrap the lazy
        // initializer so the structural match against the
        // subscribe-handler's setter argument still resolves.
        if (
          (initializerArgument.type === "ArrowFunctionExpression" ||
            initializerArgument.type === "FunctionExpression") &&
          initializerArgument.body?.type !== "BlockStatement"
        ) {
          useStateInitializerByValueName.set(binding.valueName, initializerArgument.body);
        } else {
          useStateInitializerByValueName.set(binding.valueName, initializerArgument);
        }
      }

      const setterNameToValueName = new Map<string, string>();
      for (const binding of useStateBindings) {
        setterNameToValueName.set(binding.setterName, binding.valueName);
      }

      for (const effectCall of findUseEffectsInComponent(componentBody)) {
        if ((effectCall.arguments?.length ?? 0) < 2) continue;
        const depsNode = effectCall.arguments[1];
        if (depsNode.type !== "ArrayExpression") continue;
        if ((depsNode.elements?.length ?? 0) !== 0) continue;

        const callback = getEffectCallback(effectCall);
        if (!callback || callback.body?.type !== "BlockStatement") continue;
        const effectBodyStatements = callback.body.body ?? [];
        if (effectBodyStatements.length < 2) continue;

        const subscription = findSubscriptionCall(effectBodyStatements);
        if (!subscription) continue;

        const handler = getSubscriptionHandlerArgument(subscription.call, effectBodyStatements);
        if (!handler) continue;

        const setterPayload = getSingleSetterCallFromHandler(handler);
        if (!setterPayload) continue;

        const valueName = setterNameToValueName.get(setterPayload.setterName);
        if (!valueName) continue;

        const useStateInitializer = useStateInitializerByValueName.get(valueName);
        if (!useStateInitializer) continue;

        if (!areExpressionsStructurallyEqual(useStateInitializer, setterPayload.setterArgument)) {
          continue;
        }

        if (!cleanupReleasesSubscription(effectBodyStatements, subscription.boundUnsubscribeName)) {
          continue;
        }

        const matchingBinding = useStateBindings.find((binding) => binding.valueName === valueName);
        context.report({
          node: matchingBinding?.declarator ?? effectCall,
          message: `useState "${valueName}" is synchronized with an external store via useEffect — replace this useState + useEffect pair with useSyncExternalStore(subscribe, getSnapshot) to avoid tearing during concurrent renders`,
        });
      }
    };

    return {
      FunctionDeclaration(node: EsTreeNode) {
        if (!node.id?.name || !isUppercaseName(node.id.name)) return;
        checkComponent(node.body);
      },
      VariableDeclarator(node: EsTreeNode) {
        if (!isComponentAssignment(node)) return;
        checkComponent(node.init?.body);
      },
    };
  },
});
