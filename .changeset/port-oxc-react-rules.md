---
"react-doctor": minor
"oxlint-plugin-react-doctor": minor
---

Port 11 of the 12 rules in `BUILTIN_REACT_RULES` from oxc's bundled
`react` plugin (Rust) into our oxlint JS plugin (TypeScript), and
replace our usage of those upstream defaults with the local versions.
The new rules — `react-no-children-prop`, `react-jsx-no-duplicate-props`,
`react-no-danger`, `react-jsx-no-script-url`, `react-no-render-return-value`,
`react-no-is-mounted`, `react-no-string-refs`, `react-no-direct-mutation-state`,
`react-require-render-return`, `react-jsx-key`, `react-no-unknown-property`,
and a structural `react-rules-of-hooks` — surface under the
`react-doctor/react-*` namespace and pick themselves up automatically
through the registry-driven config loop.

`react/rules-of-hooks` stays on the upstream side: it lives in oxc's
separate `react-hooks` plugin and depends on full CFG analysis we
don't reproduce in TS. The new `react-rules-of-hooks` port supplements
it for the common lexical violations (hooks called from helpers, in
conditionals, or in loops).
