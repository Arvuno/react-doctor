import {
  defineRule,
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

// HACK: an UNCONDITIONAL setter call at a component's render path
// triggers an infinite re-render loop ("Maximum update depth exceeded").
// We only flag the obvious shape — `setX(...)` as a top-level
// ExpressionStatement directly inside the component body — to avoid
// false positives on the canonical React pattern that conditionally
// updates state during render to derive from props (see
// https://react.dev/reference/react/useState#storing-information-from-previous-renders):
//
//   if (prevCount !== count) {
//     setPrevCount(count);  // ← legitimate, reaches a fixed point
//   }
//
// Conditional / loop / try-catch nesting is opaque enough that we'd
// rather miss the bug than scream at idiomatic code.
const isUnconditionalSetterCallStatement = (
  statement: EsTreeNode,
  setterNames: ReadonlySet<string>,
): EsTreeNode | null => {
  if (statement.type !== "ExpressionStatement") return null;
  const expression = statement.expression;
  if (expression?.type !== "CallExpression") return null;
  const callee = expression.callee;
  if (callee?.type !== "Identifier") return null;
  if (!setterNames.has(callee.name)) return null;
  return expression;
};

export const noSetStateInRender = defineRule<Rule>({
  create: (context: RuleContext) => {
    const checkComponent = (componentBody: EsTreeNode | null | undefined): void => {
      if (!componentBody || componentBody.type !== "BlockStatement") return;
      const setterNames = new Set(
        collectUseStateBindings(componentBody).map((binding) => binding.setterName),
      );
      if (setterNames.size === 0) return;

      for (const statement of componentBody.body ?? []) {
        const setterCall = isUnconditionalSetterCallStatement(statement, setterNames);
        if (!setterCall) continue;
        const setterIdentifierName = setterCall.callee.name;
        context.report({
          node: setterCall,
          message: `${setterIdentifierName}() called unconditionally at the top of render — causes an infinite re-render loop. Move into a useEffect or an event handler. (To derive state from props, guard the call: \`if (prev !== prop) ${setterIdentifierName}(prop)\`)`,
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
