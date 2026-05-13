import { MUTATING_ARRAY_METHODS } from "../../constants.js";
import {
  collectPatternNames,
  defineRule,
  getRootIdentifierName,
  isComponentAssignment,
  isHookCall,
  isSetterIdentifier,
  isUppercaseName,
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

// HACK: walks the component AST while tracking which state names are
// SHADOWED in the current scope by a nested function's params or
// var/let/const declarations. Without this, a handler that locally
// re-binds the state name (e.g. `const items = raw.split(",")` then
// `items.push(x)`) gets falsely flagged. We don't do real scope
// analysis (would need eslint-utils' ScopeManager) — just lexical
// param + top-level binding collection per function, which covers the
// >99% of real-world shadowing cases without false positives.
const collectFunctionLocalBindings = (functionNode: EsTreeNode): Set<string> => {
  const localBindings = new Set<string>();
  for (const param of functionNode.params ?? []) {
    collectPatternNames(param, localBindings);
  }
  if (functionNode.body?.type === "BlockStatement") {
    for (const statement of functionNode.body.body ?? []) {
      if (statement.type !== "VariableDeclaration") continue;
      for (const declarator of statement.declarations ?? []) {
        collectPatternNames(declarator.id, localBindings);
      }
    }
  }
  return localBindings;
};

const isFunctionLikeNode = (node: EsTreeNode): boolean =>
  node.type === "FunctionDeclaration" ||
  node.type === "FunctionExpression" ||
  node.type === "ArrowFunctionExpression";

const walkComponentRespectingShadows = (
  node: EsTreeNode,
  shadowedStateNames: ReadonlySet<string>,
  visit: (child: EsTreeNode, currentlyShadowed: ReadonlySet<string>) => void,
): void => {
  if (!node || typeof node !== "object") return;

  let nextShadowedStateNames = shadowedStateNames;
  if (isFunctionLikeNode(node)) {
    const localBindings = collectFunctionLocalBindings(node);
    if (localBindings.size > 0) {
      const merged = new Set(shadowedStateNames);
      for (const localName of localBindings) merged.add(localName);
      nextShadowedStateNames = merged;
    }
  }

  visit(node, shadowedStateNames);

  for (const key of Object.keys(node)) {
    if (key === "parent") continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === "object" && item.type) {
          walkComponentRespectingShadows(item, nextShadowedStateNames, visit);
        }
      }
    } else if (child && typeof child === "object" && child.type) {
      walkComponentRespectingShadows(child, nextShadowedStateNames, visit);
    }
  }
};

export const noDirectStateMutation = defineRule<Rule>({
  create: (context: RuleContext) => {
    const checkComponent = (componentBody: EsTreeNode | null | undefined): void => {
      if (!componentBody || componentBody.type !== "BlockStatement") return;
      const bindings = collectUseStateBindings(componentBody);
      if (bindings.length === 0) return;

      const stateValueToSetter = new Map<string, string>(
        bindings.map((binding) => [binding.valueName, binding.setterName] as const),
      );

      walkComponentRespectingShadows(
        componentBody,
        new Set(),
        (child: EsTreeNode, currentlyShadowed: ReadonlySet<string>) => {
          if (child.type === "AssignmentExpression") {
            if (child.left?.type !== "MemberExpression") return;
            const rootName = getRootIdentifierName(child.left);
            if (!rootName || !stateValueToSetter.has(rootName)) return;
            if (currentlyShadowed.has(rootName)) return;
            const setterName = stateValueToSetter.get(rootName);
            context.report({
              node: child,
              message: `Direct property assignment on useState value "${rootName}" — call ${setterName} with a new value; React only re-renders on a new reference`,
            });
            return;
          }

          if (child.type === "CallExpression") {
            const callee = child.callee;
            if (callee?.type !== "MemberExpression") return;
            if (callee.property?.type !== "Identifier") return;
            const methodName = callee.property.name;
            if (!MUTATING_ARRAY_METHODS.has(methodName)) return;
            const rootName = getRootIdentifierName(callee.object);
            if (!rootName || !stateValueToSetter.has(rootName)) return;
            if (currentlyShadowed.has(rootName)) return;
            const setterName = stateValueToSetter.get(rootName);
            context.report({
              node: child,
              message: `In-place mutation of useState value "${rootName}" via .${methodName}() — call ${setterName} with a new array; React only re-renders on a new reference`,
            });
          }
        },
      );
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
