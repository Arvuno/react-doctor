import {
  EFFECT_HOOK_NAMES,
  EVENT_TRIGGERED_NAVIGATION_METHOD_NAMES,
  EVENT_TRIGGERED_SIDE_EFFECT_CALLEES,
  EVENT_TRIGGERED_SIDE_EFFECT_MEMBER_METHODS,
  NAVIGATION_RECEIVER_NAMES,
} from "../../constants.js";
import {
  collectPatternNames,
  defineRule,
  getCallbackStatements,
  getEffectCallback,
  getRootIdentifierName,
  isComponentAssignment,
  isHookCall,
  isSetterIdentifier,
  isUppercaseName,
  walkAst,
  walkInsideStatementBlocks,
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

// HACK: only collect return statements at the COMPONENT'S top level —
// nested function bodies (effect cleanups, useMemo/useCallback callbacks)
// have their own return semantics that aren't render output.
const collectReturnExpressions = (componentBody: EsTreeNode): EsTreeNode[] => {
  if (componentBody?.type !== "BlockStatement") return [];
  const returns: EsTreeNode[] = [];
  for (const statement of componentBody.body ?? []) {
    if (statement.type === "ReturnStatement" && statement.argument) {
      returns.push(statement.argument);
      continue;
    }
    // Walk into IfStatement / TryStatement etc. for early-return JSX,
    // but stop at any nested function.
    walkInsideStatementBlocks(statement, (child) => {
      if (child.type === "ReturnStatement" && child.argument) {
        returns.push(child.argument);
      }
    });
  }
  return returns;
};

const collectIdentifierNames = (expression: EsTreeNode): Set<string> => {
  const names = new Set<string>();
  walkAst(expression, (child: EsTreeNode) => {
    if (child.type === "Identifier") names.add(child.name);
  });
  return names;
};

// Build a "name -> identifiers it transitively depends on" graph for
// every top-level VariableDeclarator in the component body. Includes
// names referenced anywhere inside the initializer (deps arrays, nested
// callbacks, member access — we deliberately over-approximate here so
// that `useMemo(() => derive(state), [state])` propagates `state` into
// the dependency set of the resulting variable).
const buildLocalDependencyGraph = (componentBody: EsTreeNode): Map<string, Set<string>> => {
  const graph = new Map<string, Set<string>>();
  if (componentBody?.type !== "BlockStatement") return graph;
  const declaredNames = new Set<string>();
  for (const statement of componentBody.body ?? []) {
    if (statement.type !== "VariableDeclaration") continue;
    for (const declarator of statement.declarations ?? []) {
      if (!declarator.init) continue;
      const dependencyNames = collectIdentifierNames(declarator.init);
      declaredNames.clear();
      collectPatternNames(declarator.id, declaredNames);
      for (const declaredName of declaredNames) {
        const existing = graph.get(declaredName);
        if (existing === undefined) {
          graph.set(declaredName, new Set(dependencyNames));
        } else {
          for (const dependencyName of dependencyNames) existing.add(dependencyName);
        }
      }
    }
  }
  return graph;
};

// "Read in render" = any identifier (`Identifier`, NOT `JSXIdentifier`)
// that appears anywhere inside a return expression — JSX text content,
// `{expression}` containers, attribute values like
// `<MyContext value={value}>` (the React Context case from #146),
// `style={…}`, `className={…}`, props passed to children, conditional
// chains, the lot. JSX element/tag names are `JSXIdentifier`, which we
// deliberately do not track — referring to a component by name does
// not "read" any value.
const collectRenderReachableNames = (returnExpressions: EsTreeNode[]): Set<string> => {
  const names = new Set<string>();
  for (const expression of returnExpressions) {
    walkAst(expression, (child: EsTreeNode) => {
      if (child.type === "Identifier") names.add(child.name);
    });
  }
  return names;
};

const expandTransitiveDependencies = (
  seedNames: Set<string>,
  dependencyGraph: Map<string, Set<string>>,
): Set<string> => {
  const reachable = new Set(seedNames);
  const queue: string[] = Array.from(seedNames);
  while (queue.length > 0) {
    const currentName = queue.pop();
    if (currentName === undefined) continue;
    const dependencyNames = dependencyGraph.get(currentName);
    if (!dependencyNames) continue;
    for (const dependencyName of dependencyNames) {
      if (reachable.has(dependencyName)) continue;
      reachable.add(dependencyName);
      queue.push(dependencyName);
    }
  }
  return reachable;
};

// HACK: collect names of identifiers passed as values to JSX `on*`
// attributes — these are component-bound handlers (`onClick={handleClick}`).
// Lets `isInsideEventHandler` resolve a function bound to a const back
// to its handler usage in JSX.
const collectHandlerBindingNames = (componentBody: EsTreeNode): Set<string> => {
  const handlerNames = new Set<string>();
  walkAst(componentBody, (child: EsTreeNode) => {
    if (child.type !== "JSXAttribute") return;
    if (child.name?.type !== "JSXIdentifier") return;
    if (!/^on[A-Z]/.test(child.name.name)) return;
    if (child.value?.type !== "JSXExpressionContainer") return;
    const expression = child.value.expression;
    if (expression?.type === "Identifier") handlerNames.add(expression.name);
  });
  return handlerNames;
};

const isInsideEventHandler = (node: EsTreeNode, handlerBindingNames: Set<string>): boolean => {
  let cursor: EsTreeNode | null = node.parent ?? null;
  while (cursor) {
    if (
      cursor.type === "ArrowFunctionExpression" ||
      cursor.type === "FunctionExpression" ||
      cursor.type === "FunctionDeclaration"
    ) {
      let outer: EsTreeNode | null = cursor.parent ?? null;
      while (outer) {
        if (outer.type === "JSXAttribute") {
          const attrName = outer.name?.type === "JSXIdentifier" ? outer.name.name : null;
          if (attrName && /^on[A-Z]/.test(attrName)) return true;
          return false;
        }
        if (outer.type === "VariableDeclarator") {
          const declaredName = outer.id?.type === "Identifier" ? outer.id.name : null;
          return Boolean(declaredName && handlerBindingNames.has(declaredName));
        }
        if (outer.type === "Program") return false;
        outer = outer.parent ?? null;
      }
      return false;
    }
    cursor = cursor.parent ?? null;
  }
  return false;
};

// HACK: §6 of "You Might Not Need an Effect" — sending a POST request:
//
//   const [jsonToSubmit, setJsonToSubmit] = useState(null);
//   useEffect(() => {
//     if (jsonToSubmit !== null) {
//       post('/api/register', jsonToSubmit);
//     }
//   }, [jsonToSubmit]);
//
//   function handleSubmit(event) {
//     event.preventDefault();
//     setJsonToSubmit({ firstName, lastName });   // ← only writer
//   }
//
// Detector pre-conditions (all must hold):
//   (1) useEffect with deps = [stateX] — single dep that's a useState
//       binding declared in this component
//   (2) effect body is a single IfStatement guarding on stateX with one
//       of: bare truthy, !== null/undefined, === Literal, or .length
//   (3) IfStatement.consequent contains a CallExpression whose callee
//       is in EVENT_TRIGGERED_SIDE_EFFECT_CALLEES OR a MemberExpression
//       whose property is in EVENT_TRIGGERED_SIDE_EFFECT_MEMBER_METHODS
//   (4) every setStateX call site is inside a JSX `on*` handler (or a
//       function bound to one) — i.e. the trigger is set only by user
//       interactions, never by other reactive logic
//
// Why all four matter: (1) + (2) recognize the "trigger guard" shape;
// (3) restricts to side effects users would associate with a button
// click; (4) is the strongest signal that the state exists *only* to
// schedule the effect, distinguishing this from §5 (event-shared logic
// triggered by props) which already has its own rule.
// HACK: in JS, `undefined` is parsed as an Identifier (not a Literal
// like `null`). For `x !== undefined`, both sides of the
// BinaryExpression are Identifiers, so a naive "first Identifier
// wins" pick can return `"undefined"` instead of the trigger state
// name — silently dropping the violation for the reversed
// (`undefined !== x`) ordering. Skip the `undefined` / `null`
// sentinel side so the actual state Identifier is what we return.
const SENTINEL_IDENTIFIER_NAMES = new Set(["undefined", "NaN", "null"]);

const isSentinelIdentifier = (node: EsTreeNode): boolean =>
  node?.type === "Identifier" && SENTINEL_IDENTIFIER_NAMES.has(node.name);

const getTriggerGuardRootName = (testNode: EsTreeNode): string | null => {
  if (!testNode) return null;
  if (testNode.type === "Identifier") return testNode.name;
  if (testNode.type === "BinaryExpression") {
    if (!["!==", "===", "!=", "=="].includes(testNode.operator)) return null;
    for (const side of [testNode.left, testNode.right]) {
      if (side?.type === "Identifier" && !isSentinelIdentifier(side)) {
        return side.name;
      }
    }
    return null;
  }
  if (
    testNode.type === "MemberExpression" &&
    testNode.property?.type === "Identifier" &&
    testNode.property.name === "length"
  ) {
    if (testNode.object?.type === "Identifier") return testNode.object.name;
  }
  if (testNode.type === "UnaryExpression" && testNode.operator === "!") {
    return getTriggerGuardRootName(testNode.argument);
  }
  return null;
};

const findTriggeredSideEffectCalleeName = (consequentNode: EsTreeNode): string | null => {
  let foundCalleeName: string | null = null;
  walkAst(consequentNode, (child: EsTreeNode) => {
    if (foundCalleeName) return false;
    if (child.type !== "CallExpression") return;
    const callee = child.callee;
    if (callee?.type === "Identifier" && EVENT_TRIGGERED_SIDE_EFFECT_CALLEES.has(callee.name)) {
      foundCalleeName = callee.name;
      return;
    }
    if (callee?.type === "MemberExpression" && callee.property?.type === "Identifier") {
      const propertyName = callee.property.name;
      const isUnambiguousMethod = EVENT_TRIGGERED_SIDE_EFFECT_MEMBER_METHODS.has(propertyName);
      const isNavigationMethod = EVENT_TRIGGERED_NAVIGATION_METHOD_NAMES.has(propertyName);
      if (!isUnambiguousMethod && !isNavigationMethod) return;
      const rootName = getRootIdentifierName(callee);
      if (isNavigationMethod && (rootName === null || !NAVIGATION_RECEIVER_NAMES.has(rootName))) {
        return;
      }
      foundCalleeName = rootName ? `${rootName}.${propertyName}` : propertyName;
    }
  });
  return foundCalleeName;
};

const collectHandlerOnlyWriteStateNames = (
  componentBody: EsTreeNode,
  useStateBindings: Array<{ valueName: string; setterName: string; declarator: EsTreeNode }>,
  handlerBindingNames: Set<string>,
): Set<string> => {
  const handlerOnlyWriteStateNames = new Set<string>();
  for (const binding of useStateBindings) {
    let didFindAnySetterCall = false;
    let areAllSetterCallsInHandlers = true;
    walkAst(componentBody, (child: EsTreeNode) => {
      if (!areAllSetterCallsInHandlers) return false;
      if (child.type !== "CallExpression") return;
      if (child.callee?.type !== "Identifier") return;
      if (child.callee.name !== binding.setterName) return;
      didFindAnySetterCall = true;
      if (!isInsideEventHandler(child, handlerBindingNames)) {
        areAllSetterCallsInHandlers = false;
      }
    });
    if (didFindAnySetterCall && areAllSetterCallsInHandlers) {
      handlerOnlyWriteStateNames.add(binding.valueName);
    }
  }
  return handlerOnlyWriteStateNames;
};

export const noEventTriggerState = defineRule<Rule>({
  create: (context: RuleContext) => {
    const checkComponent = (componentBody: EsTreeNode | null | undefined): void => {
      if (!componentBody || componentBody.type !== "BlockStatement") return;

      const useStateBindings = collectUseStateBindings(componentBody);
      if (useStateBindings.length === 0) return;

      const handlerBindingNames = collectHandlerBindingNames(componentBody);
      const handlerOnlyWriteStateNames = collectHandlerOnlyWriteStateNames(
        componentBody,
        useStateBindings,
        handlerBindingNames,
      );
      if (handlerOnlyWriteStateNames.size === 0) return;

      // HACK: a state read in render (e.g. `<input value={query} />`)
      // is dual-purpose — it controls UI AND triggers the effect.
      // Calling it "exists only to schedule the effect" is wrong; the
      // user can't just delete the state. Reuse the same render-
      // reachability machinery that `rerenderStateOnlyInHandlers`
      // uses to filter these out (transitive dep graph + walk from
      // return expressions).
      const returnExpressions = collectReturnExpressions(componentBody);
      const dependencyGraph = buildLocalDependencyGraph(componentBody);
      const directRenderNames = collectRenderReachableNames(returnExpressions);
      const renderReachableNames = expandTransitiveDependencies(directRenderNames, dependencyGraph);

      walkAst(componentBody, (effectCall: EsTreeNode) => {
        if (effectCall.type !== "CallExpression") return;
        if (!isHookCall(effectCall, EFFECT_HOOK_NAMES)) return;
        if ((effectCall.arguments?.length ?? 0) < 2) return;

        const depsNode = effectCall.arguments[1];
        if (depsNode.type !== "ArrayExpression") return;
        if ((depsNode.elements?.length ?? 0) !== 1) return;

        const depElement = depsNode.elements[0];
        if (depElement?.type !== "Identifier") return;
        if (!handlerOnlyWriteStateNames.has(depElement.name)) return;
        // Dual-purpose state — used in render too. Don't claim it
        // "exists only to schedule" the effect.
        if (renderReachableNames.has(depElement.name)) return;

        const callback = getEffectCallback(effectCall);
        if (!callback) return;

        const bodyStatements = getCallbackStatements(callback);
        if (bodyStatements.length !== 1) return;
        const soleStatement = bodyStatements[0];
        if (soleStatement.type !== "IfStatement") return;

        const guardRootName = getTriggerGuardRootName(soleStatement.test);
        if (guardRootName !== depElement.name) return;

        const sideEffectCalleeName = findTriggeredSideEffectCalleeName(soleStatement.consequent);
        if (!sideEffectCalleeName) return;

        context.report({
          node: effectCall,
          message: `useState "${depElement.name}" exists only to schedule "${sideEffectCalleeName}(...)" from a useEffect — call "${sideEffectCalleeName}(...)" directly inside the event handler that sets it, and delete the state`,
        });
      });
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
