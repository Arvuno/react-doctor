import { defineRule, isComponentAssignment, isUppercaseName, walkAst } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

const DEFERRABLE_HOOK_NAMES = new Set(["useSearchParams", "useParams", "usePathname"]);

const findHookCallBindings = (
  componentBody: EsTreeNode,
): Array<{ valueName: string; hookName: string; declarator: EsTreeNode }> => {
  const bindings: Array<{ valueName: string; hookName: string; declarator: EsTreeNode }> = [];
  if (componentBody?.type !== "BlockStatement") return bindings;

  for (const statement of componentBody.body ?? []) {
    if (statement.type !== "VariableDeclaration") continue;
    for (const declarator of statement.declarations ?? []) {
      if (declarator.id?.type !== "Identifier") continue;
      if (declarator.init?.type !== "CallExpression") continue;
      const callee = declarator.init.callee;
      if (callee?.type !== "Identifier") continue;
      if (!DEFERRABLE_HOOK_NAMES.has(callee.name)) continue;
      bindings.push({
        valueName: declarator.id.name,
        hookName: callee.name,
        declarator,
      });
    }
  }
  return bindings;
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

// HACK: subscribing to `useSearchParams()` / `useParams()` /
// `usePathname()` makes the component re-render whenever the URL state
// changes — even when the component only reads the value inside an
// onClick / onSubmit handler. In that case the value is read at click
// time anyway; the subscription is wasted work.
//
// Better pattern: read inside the handler via the underlying API
// (`new URL(window.location.href).searchParams`), or build a small
// custom hook that exposes a `getSearchParams()` getter without
// subscribing. The result is fewer renders without losing the data.
//
// Heuristic: hook value-name appears only inside arrow / function
// expressions that are themselves bound to JSX `on*` attributes.
export const rerenderDeferReadsHook = defineRule<Rule>({
  create: (context: RuleContext) => {
    const checkComponent = (componentBody: EsTreeNode | null | undefined): void => {
      if (!componentBody || componentBody.type !== "BlockStatement") return;
      const bindings = findHookCallBindings(componentBody);
      if (bindings.length === 0) return;
      const handlerBindingNames = collectHandlerBindingNames(componentBody);

      for (const binding of bindings) {
        const referenceLocations: EsTreeNode[] = [];
        walkAst(componentBody, (child: EsTreeNode) => {
          if (child === binding.declarator.id) return;
          if (child.type === "Identifier" && child.name === binding.valueName) {
            referenceLocations.push(child);
          }
        });

        if (referenceLocations.length === 0) continue;

        const allInHandlers = referenceLocations.every((ref) =>
          isInsideEventHandler(ref, handlerBindingNames),
        );
        if (!allInHandlers) continue;

        context.report({
          node: binding.declarator,
          message: `${binding.hookName}() return is only read inside event handlers — defer the read into the handler (e.g. \`new URL(window.location.href).searchParams\`) so the component doesn't re-render on every URL change`,
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
