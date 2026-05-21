# Husky + lint-staged Integration Guide

Add pre-commit React Doctor checks to catch issues before they reach CI.

## Install Dependencies

```bash
pnpm add -D husky lint-staged
pnpm exec husky init
```

## Configure lint-staged

Add to `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["react-doctor --diff HEAD --fail-on warning"]
  }
}
```

The `--diff HEAD` scope ensures pre-commit checks only flag issues in your current changes, not existing backlog. Use `--fail-on error` for stricter enforcement.

## Configure Husky

The `.husky/pre-commit` hook is created automatically by `husky init`. Verify its contents:

```bash
cat .husky/pre-commit
```

It should run lint-staged. If not, edit it to:

```bash
npx lint-staged
```

## Skip Pre-commit on Large Refactors

When making mechanical changes across many files, bypass the pre-commit hook:

```bash
git commit --no-verify -m "bulk refactor: update types"
```

## Troubleshooting

**Pre-commit runs but passes even with errors**: Ensure `react-doctor` is installed in your project (`npx react-doctor --version` to verify).

**Slow pre-commit checks**: Use `--diff HEAD` to limit scope to changed files only. For large monorepos, consider running on a timeout:

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["timeout 60 react-doctor --diff HEAD --fail-on warning"]
  }
}
```

**lint-staged not running**: Check that your `package.json` `lint-staged` config is valid JSON (not JSONC with comments). Use a separate `lint-staged.config.js` if needed.

**Husky not triggering**: Run `pnpm exec husky install` to reinstall the hook, or check that `.husky/` is tracked in git and not ignored.