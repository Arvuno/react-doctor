import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

// HACK: React 19+ deprecated `forwardRef` (refs are now regular props on
// function components) and `useContext` (replaced by the more flexible
// `use()`). Catches both named imports (`import { forwardRef } from "react"`)
// AND member access on namespace/default imports (`React.forwardRef`,
// `React.useContext` after `import React from "react"` or
// `import * as React from "react"`).
//
// Stored as a Map (not a plain object) because plain-object lookups inherit
// from `Object.prototype` — `messages["constructor"]` returns the native
// `Object` function, which is truthy and would silently false-positive on
// `import { constructor } from "react"` or `React.toString()`. Maps return
// `undefined` for missing keys with no prototype fall-through.
const REACT_19_DEPRECATED_MESSAGES = new Map<string, string>([
  [
    "forwardRef",
    "forwardRef is no longer needed on React 19+ — refs are regular props on function components; remove forwardRef and pass ref directly",
  ],
  [
    "useContext",
    "useContext is superseded by `use()` on React 19+ — `use()` reads context conditionally inside hooks, branches, and loops; switch to `import { use } from 'react'`",
  ],
]);

interface DeprecatedReactImportRuleOptions {
  /** The exact `import "..."` source string this rule watches. */
  source: string;
  /** Per-imported-name message dictionary. Exact-match lookup. */
  messages: ReadonlyMap<string, string>;
  /**
   * Optional extra ImportDeclaration handler invoked BEFORE the standard
   * source check — used by the react-dom rule to flag every import from
   * `react-dom/test-utils` (whole entry point gone in React 19).
   * Return `true` to mark "handled, skip the standard branch".
   */
  handleExtraSource?: (node: EsTreeNode, context: RuleContext) => boolean;
}

// HACK: shared scaffolding for "report deprecated React-package imports".
// Both `noReact19DeprecatedApis` (for `react`) and
// `noReactDomDeprecatedApis` (for `react-dom`) want the same shape:
//   - bind namespace/default imports of the source to a Set
//   - on ImportSpecifier, look the imported name up in a message map
//   - on MemberExpression off a tracked binding, look the property up
// Hoisting the pattern keeps the two call sites tiny and means future
// React deprecations (e.g. a `react/jsx-runtime` rule) need just one
// new factory call.
const createDeprecatedReactImportRule = ({
  source,
  messages,
  handleExtraSource,
}: DeprecatedReactImportRuleOptions): Rule => ({
  create: (context: RuleContext) => {
    const namespaceBindings = new Set<string>();

    return {
      ImportDeclaration(node: EsTreeNode) {
        const sourceValue = node.source?.value;
        if (typeof sourceValue !== "string") return;
        if (handleExtraSource?.(node, context)) return;
        if (sourceValue !== source) return;

        for (const specifier of node.specifiers ?? []) {
          if (specifier.type === "ImportSpecifier") {
            const importedName = specifier.imported?.name;
            if (!importedName) continue;
            const message = messages.get(importedName);
            if (message) context.report({ node: specifier, message });
            continue;
          }
          if (
            specifier.type === "ImportDefaultSpecifier" ||
            specifier.type === "ImportNamespaceSpecifier"
          ) {
            const localName = specifier.local?.name;
            if (localName) namespaceBindings.add(localName);
          }
        }
      },
      MemberExpression(node: EsTreeNode) {
        if (namespaceBindings.size === 0) return;
        if (node.computed) return;
        if (node.object?.type !== "Identifier") return;
        if (!namespaceBindings.has(node.object.name)) return;
        if (node.property?.type !== "Identifier") return;
        const message = messages.get(node.property.name);
        if (message) context.report({ node, message });
      },
    };
  },
});

export const noReact19DeprecatedApis = defineRule<Rule>(
  createDeprecatedReactImportRule({
    source: "react",
    messages: REACT_19_DEPRECATED_MESSAGES,
  }),
);
