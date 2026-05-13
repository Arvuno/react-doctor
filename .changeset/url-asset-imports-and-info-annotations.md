---
"react-doctor": patch
---

Temporarily disable the codebase graph checks (dead-code, dependencies,
react-architecture) by default in the CLI. They still produce too many
false positives on large/monorepo codebases (e.g. PostHog: 14k+ warnings,
1.6k errors driven by `unresolved-import`, `unused-export`, etc.) to be
acceptable as default-on diagnostics. Opt back in per-run with
`--dead-code` or persistently via `"reactDoctor": { "deadCode": true }`
in `package.json` / `react-doctor.config.json`. The SDK behavior is
unchanged (it was already opt-in there).

Fix three false-positive sources that surfaced when the graph is enabled:

- The codebase analyzer's extractor records every
  `new URL(specifier, import.meta.url)` as an asset import, but the
  resolver still ran ordinary module resolution against the specifier.
  Idiomatic Node config patterns like
  `fileURLToPath(new URL("./src", import.meta.url))` therefore emitted
  an `unresolved-import` error even though the URL is only used for
  path computation. Asset URLs that don't resolve as modules are now
  treated as silent asset references (tracking the file path when it
  exists on disk so dead-code detection still sees the reference).
- `--annotations` mapped every non-error severity to `::warning`, which
  promoted `info` diagnostics (e.g. the demoted `unused-type-export`
  rule) to warning-level CI annotations. Info diagnostics are exempt
  from scoring and meant to surface only in `--verbose`; they are now
  skipped entirely from GitHub Actions annotations.
- The `vite` and `nextjs` codebase plugins registered
  `vite.config.{*}` and `next.config.{*}` as **runtime** entrypoints,
  which made their build-time plugin imports
  (`@vitejs/plugin-react`, `@tailwindcss/vite`, `@next/mdx`, ...) look
  like runtime dependencies and triggered `runtime-dev-dependency`
  warnings on packages that are correctly declared in devDependencies.
  Both plugins now leave config files to be picked up as `support`
  entries by the generic `*.config.*` rule in `SUPPORT_ENTRY_PATTERNS`
  — plugin imports are still tracked as used dependencies, but no
  longer count as runtime usage.
